from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

from django.conf import settings
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from apps.ledger.models import Movement

NAVY = "0F172A"
EMERALD = "10B981"
EMERALD_SOFT = "D1FAE5"
GOLD = "F59E0B"
WHITE_BG = "F8FAFC"
PURE_WHITE = "FFFFFF"
ROSE = "E11D48"
BORDER_COLOR = "CBD5E1"
MUTED_TEXT = "475569"

CURRENCY_FMT = '"$"#,##0.00'
PERCENT_FMT = "0.00%"

THIN_BORDER = Border(
    left=Side(style="thin", color=BORDER_COLOR),
    right=Side(style="thin", color=BORDER_COLOR),
    top=Side(style="thin", color=BORDER_COLOR),
    bottom=Side(style="thin", color=BORDER_COLOR),
)

MOVEMENT_TYPE_LABELS = {
    Movement.MovementType.INITIAL: "Saldo inicial",
    Movement.MovementType.INCOME: "Ingreso",
    Movement.MovementType.EXPENSE: "Gasto",
    Movement.MovementType.TRANSFER_IN: "Transf. recibida",
    Movement.MovementType.TRANSFER_OUT: "Transf. enviada",
    Movement.MovementType.ADJUSTMENT: "Reversión",
}


def _apply_banner(ws, title: str, subtitle: str, max_col: int) -> None:
    """Render the dark navy corporate banner with the embedded Finova icon."""
    navy_fill = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
    for row in (1, 2):
        ws.row_dimensions[row].height = 24
        for col in range(1, max_col + 1):
            ws.cell(row=row, column=col).fill = navy_fill

    ws.merge_cells(start_row=1, start_column=2, end_row=1, end_column=max_col)
    ws.merge_cells(start_row=2, start_column=2, end_row=2, end_column=max_col)

    title_cell = ws.cell(row=1, column=2, value=title)
    title_cell.font = Font(name="Calibri", size=14, bold=True, color=WHITE_BG)
    title_cell.alignment = Alignment(vertical="center", horizontal="left")

    sub_cell = ws.cell(row=2, column=2, value=subtitle)
    sub_cell.font = Font(name="Calibri", size=10, bold=True, color=GOLD)
    sub_cell.alignment = Alignment(vertical="center", horizontal="left")

    icon_path = Path(settings.BASE_DIR) / "assets" / "finova-icon.jpg"
    if icon_path.exists():
        img = XLImage(str(icon_path))
        img.width = 48
        img.height = 48
        ws.add_image(img, "A1")


def _write_movements_sheet(ws, movements, tz_name: str, title: str, subtitle: str) -> None:
    """Populate a styled movements audit sheet."""
    ws.views.sheetView[0].showGridLines = True
    _apply_banner(ws, title, subtitle, max_col=9)

    headers = [
        "Fecha",
        "Hora",
        "Cuenta",
        "Tipo",
        "Categoría",
        "Descripción",
        "Valor",
        "Saldo Antes",
        "Saldo Después",
    ]
    header_row = 4
    ws.row_dimensions[header_row].height = 24
    header_fill = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color=PURE_WHITE)

    for col_idx, text in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=text)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(
            vertical="center",
            horizontal="right" if col_idx >= 7 else "left",
        )
        cell.border = THIN_BORDER

    tz = ZoneInfo(tz_name)
    zebra_fill = PatternFill(start_color=WHITE_BG, end_color=WHITE_BG, fill_type="solid")
    white_fill = PatternFill(start_color=PURE_WHITE, end_color=PURE_WHITE, fill_type="solid")

    row_idx = header_row + 1
    for i, mov in enumerate(movements):
        local_dt = mov.occurred_at.astimezone(tz)
        fill = zebra_fill if i % 2 == 1 else white_fill
        is_out = mov.type in (Movement.MovementType.EXPENSE, Movement.MovementType.TRANSFER_OUT)
        amount_val = float(-mov.amount if is_out else mov.amount)

        values = [
            local_dt.strftime("%Y-%m-%d"),
            local_dt.strftime("%H:%M"),
            mov.account.name,
            MOVEMENT_TYPE_LABELS.get(mov.type, mov.type),
            mov.category.name if mov.category else "—",
            mov.description,
            amount_val,
            float(mov.balance_before),
            float(mov.balance_after),
        ]

        ws.row_dimensions[row_idx].height = 20
        for col_idx, val in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.fill = fill
            cell.border = THIN_BORDER
            cell.font = Font(name="Calibri", size=10, color=NAVY)
            if col_idx >= 7:
                cell.number_format = CURRENCY_FMT
                cell.alignment = Alignment(vertical="center", horizontal="right")
                if col_idx == 7:
                    cell.font = Font(
                        name="Calibri",
                        size=10,
                        bold=True,
                        color=ROSE if is_out else EMERALD,
                    )
            else:
                cell.alignment = Alignment(vertical="center", horizontal="left")
        row_idx += 1

    ws.freeze_panes = f"A{header_row + 1}"
    widths = [14, 10, 18, 18, 18, 36, 16, 16, 16]
    for col_idx, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width


def build_period_report_xlsx(
    *,
    user,
    period_type: str,
    period_start: date,
    period_end: date,
    report_data: dict,
    movements,
) -> bytes:
    """Build Option 1 (Executive Corporate) multi-sheet Excel workbook for a period report."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Resumen Ejecutivo"

    period_label = "Semanal" if period_type == "WEEKLY" else "Mensual"
    _apply_banner(
        ws,
        f"FINOVA — Reporte Financiero {period_label}",
        f"Período: {period_start.isoformat()} al {period_end.isoformat()} · Usuario: {user.email}",
        max_col=5,
    )

    # KPI Section (Rows 4-5)
    kpis = [
        ("Total Ingresado", float(Decimal(report_data["total_income"])), EMERALD, CURRENCY_FMT),
        ("Total Gastado", float(Decimal(report_data["total_expense"])), ROSE, CURRENCY_FMT),
        ("Balance Neto", float(Decimal(report_data["net_balance"])), NAVY, CURRENCY_FMT),
        (
            "Tasa de Ahorro",
            float(Decimal(report_data["savings_rate_pct"]) / Decimal("100")),
            GOLD,
            PERCENT_FMT,
        ),
        ("Movimientos", int(report_data["movement_count"]), NAVY, "#,##0"),
    ]

    ws.row_dimensions[4].height = 18
    ws.row_dimensions[5].height = 26
    kpi_label_fill = PatternFill(start_color=WHITE_BG, end_color=WHITE_BG, fill_type="solid")
    kpi_val_fill = PatternFill(start_color=PURE_WHITE, end_color=PURE_WHITE, fill_type="solid")

    for col_idx, (label, val, color, num_fmt) in enumerate(kpis, start=1):
        lbl_cell = ws.cell(row=4, column=col_idx, value=label)
        lbl_cell.font = Font(name="Calibri", size=9, bold=True, color=MUTED_TEXT)
        lbl_cell.fill = kpi_label_fill
        lbl_cell.alignment = Alignment(vertical="center", horizontal="center")
        lbl_cell.border = THIN_BORDER

        val_cell = ws.cell(row=5, column=col_idx, value=val)
        val_cell.font = Font(name="Calibri", size=12, bold=True, color=color)
        val_cell.fill = kpi_val_fill
        val_cell.alignment = Alignment(vertical="center", horizontal="center")
        val_cell.number_format = num_fmt
        val_cell.border = THIN_BORDER

    # Top Categories Table (Row 7+)
    section_cell = ws.cell(row=7, column=1, value="Top Categorías de Gasto")
    section_cell.font = Font(name="Calibri", size=11, bold=True, color=NAVY)

    cat_headers = ["Categoría", "Movimientos", "Total Gastado", "% del Gasto"]
    header_row = 8
    ws.row_dimensions[header_row].height = 22
    header_fill = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
    for col_idx, text in enumerate(cat_headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=text)
        cell.fill = header_fill
        cell.font = Font(name="Calibri", size=10, bold=True, color=PURE_WHITE)
        cell.alignment = Alignment(
            vertical="center",
            horizontal="right" if col_idx >= 2 else "left",
        )
        cell.border = THIN_BORDER

    total_expense = Decimal(report_data["total_expense"])
    zebra_fill = PatternFill(start_color=WHITE_BG, end_color=WHITE_BG, fill_type="solid")
    white_fill = PatternFill(start_color=PURE_WHITE, end_color=PURE_WHITE, fill_type="solid")

    row_idx = header_row + 1
    categories = report_data.get("top_expense_categories", [])
    for i, cat in enumerate(categories):
        fill = zebra_fill if i % 2 == 1 else white_fill
        cat_total = Decimal(cat["total"])
        share = float(cat_total / total_expense) if total_expense > Decimal("0.00") else 0.0
        row_vals = [cat["category_name"], int(cat["count"]), float(cat_total), share]

        ws.row_dimensions[row_idx].height = 20
        for col_idx, val in enumerate(row_vals, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.fill = fill
            cell.border = THIN_BORDER
            cell.font = Font(name="Calibri", size=10, color=NAVY)
            if col_idx == 2:
                cell.alignment = Alignment(vertical="center", horizontal="right")
                cell.number_format = "#,##0"
            elif col_idx == 3:
                cell.alignment = Alignment(vertical="center", horizontal="right")
                cell.number_format = CURRENCY_FMT
            elif col_idx == 4:
                cell.alignment = Alignment(vertical="center", horizontal="right")
                cell.number_format = PERCENT_FMT
            else:
                cell.alignment = Alignment(vertical="center", horizontal="left")
        row_idx += 1

    # Total Row
    total_fill = PatternFill(start_color=EMERALD_SOFT, end_color=EMERALD_SOFT, fill_type="solid")
    ws.row_dimensions[row_idx].height = 22
    total_vals = [
        "TOTAL",
        sum(int(c["count"]) for c in categories),
        float(sum((Decimal(c["total"]) for c in categories), Decimal("0.00"))),
        1.0 if categories else 0.0,
    ]
    for col_idx, val in enumerate(total_vals, start=1):
        cell = ws.cell(row=row_idx, column=col_idx, value=val)
        cell.fill = total_fill
        cell.border = THIN_BORDER
        cell.font = Font(name="Calibri", size=10, bold=True, color=NAVY)
        if col_idx == 2:
            cell.alignment = Alignment(vertical="center", horizontal="right")
            cell.number_format = "#,##0"
        elif col_idx == 3:
            cell.alignment = Alignment(vertical="center", horizontal="right")
            cell.number_format = CURRENCY_FMT
        elif col_idx == 4:
            cell.alignment = Alignment(vertical="center", horizontal="right")
            cell.number_format = PERCENT_FMT
        else:
            cell.alignment = Alignment(vertical="center", horizontal="left")

    for col_idx, width in enumerate([24, 18, 20, 18, 18], start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    # Sheet 2: Detailed movements
    tz_name = getattr(user, "timezone", "America/Bogota") or "America/Bogota"
    ws_det = wb.create_sheet("Detalle Movimientos")
    _write_movements_sheet(
        ws_det,
        movements,
        tz_name=tz_name,
        title=f"FINOVA — Detalle de Movimientos ({period_label})",
        subtitle=f"Período: {period_start.isoformat()} al {period_end.isoformat()}",
    )

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def build_audit_xlsx(*, user, movements) -> bytes:
    """Build Option 1 (Executive Corporate) Excel workbook for filtered audit movements."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Auditoría de Movimientos"
    tz_name = getattr(user, "timezone", "America/Bogota") or "America/Bogota"
    _write_movements_sheet(
        ws,
        movements,
        tz_name=tz_name,
        title="FINOVA — Historial de Auditoría",
        subtitle=f"Usuario: {user.email} · Exportación oficial de movimientos",
    )
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
