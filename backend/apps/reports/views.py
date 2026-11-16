from datetime import date

from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ledger.models import Movement

from .excel import build_period_report_xlsx
from .models import ReportSnapshot
from .services import (
    compute_period_report,
    get_balance_trend,
    get_dashboard_summary,
    get_period_bounds,
)


class DashboardSummaryView(APIView):
    def get(self, request):
        account_id = request.query_params.get("account")
        parsed_account = int(account_id) if account_id else None
        data = get_dashboard_summary(user=request.user, account_id=parsed_account)
        return Response(data)


class PeriodReportExportXlsxView(APIView):
    def get(self, request):
        period_type = request.query_params.get("period_type", "MONTHLY").upper()
        if period_type not in ("WEEKLY", "MONTHLY"):
            return Response(
                {"detail": "period_type must be WEEKLY or MONTHLY."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ref_param = request.query_params.get("reference_date")
        try:
            ref_date = date.fromisoformat(ref_param) if ref_param else None
        except ValueError:
            return Response(
                {"detail": "reference_date must be YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account_id = request.query_params.get("account")
        parsed_account = int(account_id) if account_id else None

        tz_name = getattr(request.user, "timezone", "America/Bogota") or "America/Bogota"
        start_d, end_d, start_dt, end_dt = get_period_bounds(
            period_type, reference_date=ref_date, tz_name=tz_name
        )
        report = compute_period_report(
            user=request.user,
            start_dt=start_dt,
            end_dt=end_dt,
            account_id=parsed_account,
        )
        movements_qs = (
            Movement.objects.select_related("account", "category")
            .filter(
                account__user=request.user,
                occurred_at__gte=start_dt,
                occurred_at__lte=end_dt,
            )
            .order_by("-occurred_at", "-id")
        )
        if parsed_account is not None:
            movements_qs = movements_qs.filter(account_id=parsed_account)

        xlsx_bytes = build_period_report_xlsx(
            user=request.user,
            period_type=period_type,
            period_start=start_d,
            period_end=end_d,
            report_data=report,
            movements=movements_qs,
        )
        filename = f"finova-reporte-{period_type.lower()}-{start_d.isoformat()}.xlsx"
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class BalanceTrendView(APIView):
    def get(self, request):
        days_param = request.query_params.get("days", "14")
        try:
            days = min(max(int(days_param), 1), 90)
        except ValueError:
            days = 14
        account_id = request.query_params.get("account")
        parsed_account = int(account_id) if account_id else None
        data = get_balance_trend(user=request.user, days=days, account_id=parsed_account)
        return Response({"days": days, "series": data})


class PeriodReportView(APIView):
    def get(self, request):
        period_type = request.query_params.get("period_type", "MONTHLY").upper()
        if period_type not in ("WEEKLY", "MONTHLY"):
            return Response(
                {"detail": "period_type must be WEEKLY or MONTHLY."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ref_param = request.query_params.get("reference_date")
        try:
            ref_date = date.fromisoformat(ref_param) if ref_param else None
        except ValueError:
            return Response(
                {"detail": "reference_date must be YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account_id = request.query_params.get("account")
        parsed_account = int(account_id) if account_id else None

        tz_name = getattr(request.user, "timezone", "America/Bogota") or "America/Bogota"
        start_d, end_d, start_dt, end_dt = get_period_bounds(
            period_type, reference_date=ref_date, tz_name=tz_name
        )
        report = compute_period_report(
            user=request.user,
            start_dt=start_dt,
            end_dt=end_dt,
            account_id=parsed_account,
        )
        return Response(
            {
                "period_type": period_type,
                "period_start": start_d.isoformat(),
                "period_end": end_d.isoformat(),
                **report,
            }
        )


class ReportSnapshotListView(generics.ListAPIView):
    def get_queryset(self):
        return ReportSnapshot.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        snapshots = self.get_queryset()[:24]
        data = [
            {
                "id": s.id,
                "period_type": s.period_type,
                "period_start": s.period_start.isoformat(),
                "period_end": s.period_end.isoformat(),
                "total_income": str(s.total_income),
                "total_expense": str(s.total_expense),
                "net_balance": str(s.net_balance),
                "movement_count": s.movement_count,
                "top_expense_categories": s.top_expense_categories,
                "generated_at": s.generated_at.isoformat(),
            }
            for s in snapshots
        ]
        return Response(data)


class PeriodReportExportXlsxView(APIView):
    def get(self, request):
        period_type = request.query_params.get("period_type", "MONTHLY").upper()
        if period_type not in ("WEEKLY", "MONTHLY"):
            return Response(
                {"detail": "period_type must be WEEKLY or MONTHLY."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ref_param = request.query_params.get("reference_date")
        try:
            ref_date = date.fromisoformat(ref_param) if ref_param else None
        except ValueError:
            return Response(
                {"detail": "reference_date must be YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account_id = request.query_params.get("account")
        parsed_account = int(account_id) if account_id else None

        tz_name = getattr(request.user, "timezone", "America/Bogota") or "America/Bogota"
        start_d, end_d, start_dt, end_dt = get_period_bounds(
            period_type, reference_date=ref_date, tz_name=tz_name
        )
        report = compute_period_report(
            user=request.user,
            start_dt=start_dt,
            end_dt=end_dt,
            account_id=parsed_account,
        )
        movements_qs = (
            Movement.objects.select_related("account", "category")
            .filter(
                account__user=request.user,
                occurred_at__gte=start_dt,
                occurred_at__lte=end_dt,
            )
            .order_by("-occurred_at", "-id")
        )
        if parsed_account is not None:
            movements_qs = movements_qs.filter(account_id=parsed_account)

        xlsx_bytes = build_period_report_xlsx(
            user=request.user,
            period_type=period_type,
            period_start=start_d,
            period_end=end_d,
            report_data=report,
            movements=movements_qs,
        )
        filename = f"finova-reporte-{period_type.lower()}-{start_d.isoformat()}.xlsx"
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
