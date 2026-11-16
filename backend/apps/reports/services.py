from calendar import monthrange
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db.models import Count, Sum
from django.utils import timezone

from apps.accounts.models import Account
from apps.ledger.models import Movement


def get_period_bounds(
    period_type: str,
    reference_date: date | None = None,
    tz_name: str = "America/Bogota",
) -> tuple[date, date, datetime, datetime]:
    """Return (start_date, end_date, start_utc, end_utc) for DAY, WEEKLY, or MONTHLY."""
    tz = ZoneInfo(tz_name)
    today = reference_date or timezone.now().astimezone(tz).date()

    if period_type == "DAY":
        start_d = today
        end_d = today
    elif period_type == "WEEKLY":
        start_d = today - timedelta(days=today.weekday())
        end_d = start_d + timedelta(days=6)
    elif period_type == "MONTHLY":
        start_d = today.replace(day=1)
        last_day = monthrange(today.year, today.month)[1]
        end_d = today.replace(day=last_day)
    else:
        raise ValueError(f"Unsupported period_type: {period_type}")

    start_dt = datetime.combine(start_d, time.min, tzinfo=tz)
    end_dt = datetime.combine(end_d, time.max, tzinfo=tz)
    return start_d, end_d, start_dt, end_dt


def compute_period_report(
    *,
    user,
    start_dt: datetime,
    end_dt: datetime,
    account_id: int | None = None,
) -> dict:
    """Compute income, expense, net balance, movement count, and top categories."""
    qs = Movement.objects.filter(
        account__user=user,
        occurred_at__gte=start_dt,
        occurred_at__lte=end_dt,
    )
    if account_id is not None:
        qs = qs.filter(account_id=account_id)

    income_total = (
        qs.filter(type=Movement.MovementType.INCOME).aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    ).quantize(Decimal("0.01"))
    expense_total = (
        qs.filter(type=Movement.MovementType.EXPENSE).aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    ).quantize(Decimal("0.01"))
    movement_count = qs.filter(
        type__in=[Movement.MovementType.INCOME, Movement.MovementType.EXPENSE]
    ).count()

    top_categories_qs = (
        qs.filter(type=Movement.MovementType.EXPENSE)
        .values("category__id", "category__name", "category__color")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:5]
    )

    top_expense_categories = [
        {
            "category_id": row["category__id"],
            "category_name": row["category__name"] or "Sin categoría",
            "category_color": row["category__color"] or "#64748b",
            "total": str(Decimal(row["total"]).quantize(Decimal("0.01"))),
            "count": row["count"],
        }
        for row in top_categories_qs
    ]

    net_balance = (income_total - expense_total).quantize(Decimal("0.01"))
    savings_rate = (
        round(((income_total - expense_total) / income_total) * Decimal("100"), 2)
        if income_total > Decimal("0.00")
        else Decimal("0.00")
    )

    return {
        "total_income": str(income_total),
        "total_expense": str(expense_total),
        "net_balance": str(net_balance),
        "savings_rate_pct": str(savings_rate),
        "movement_count": movement_count,
        "top_expense_categories": top_expense_categories,
    }


def get_dashboard_summary(*, user, account_id: int | None = None) -> dict:
    """Build current balance and day/week/month summaries for the dashboard."""
    accounts_qs = Account.objects.filter(user=user)
    if account_id is not None:
        accounts_qs = accounts_qs.filter(id=account_id)

    total_balance = (
        accounts_qs.aggregate(total=Sum("balance"))["total"] or Decimal("0.00")
    ).quantize(Decimal("0.01"))

    tz_name = getattr(user, "timezone", "America/Bogota") or "America/Bogota"
    summaries = {}
    for key, ptype in (("today", "DAY"), ("week", "WEEKLY"), ("month", "MONTHLY")):
        start_d, end_d, start_dt, end_dt = get_period_bounds(ptype, tz_name=tz_name)
        report = compute_period_report(
            user=user,
            start_dt=start_dt,
            end_dt=end_dt,
            account_id=account_id,
        )
        summaries[key] = {
            "period_start": start_d.isoformat(),
            "period_end": end_d.isoformat(),
            **report,
        }

    return {
        "total_balance": str(total_balance),
        "currency": getattr(user, "default_currency", "COP"),
        "summaries": summaries,
    }


def get_balance_trend(*, user, days: int = 14, account_id: int | None = None) -> list[dict]:
    """Return daily balance, income, and expense series for the last N days."""
    tz_name = getattr(user, "timezone", "America/Bogota") or "America/Bogota"
    tz = ZoneInfo(tz_name)
    today = timezone.now().astimezone(tz).date()
    start_date = today - timedelta(days=max(days - 1, 0))

    accounts_qs = Account.objects.filter(user=user)
    if account_id is not None:
        accounts_qs = accounts_qs.filter(id=account_id)
    current_balance = (
        accounts_qs.aggregate(total=Sum("balance"))["total"] or Decimal("0.00")
    ).quantize(Decimal("0.01"))

    start_dt = datetime.combine(start_date, time.min, tzinfo=tz)
    movements = (
        Movement.objects.filter(account__user=user, occurred_at__gte=start_dt)
        .order_by("occurred_at", "id")
    )
    if account_id is not None:
        movements = movements.filter(account_id=account_id)

    daily_income: dict[date, Decimal] = {}
    daily_expense: dict[date, Decimal] = {}
    daily_net_delta: dict[date, Decimal] = {}

    for m in movements:
        d = m.occurred_at.astimezone(tz).date()
        if m.type == Movement.MovementType.INCOME:
            daily_income[d] = daily_income.get(d, Decimal("0.00")) + m.amount
            daily_net_delta[d] = daily_net_delta.get(d, Decimal("0.00")) + m.amount
        elif m.type == Movement.MovementType.EXPENSE:
            daily_expense[d] = daily_expense.get(d, Decimal("0.00")) + m.amount
            daily_net_delta[d] = daily_net_delta.get(d, Decimal("0.00")) - m.amount
        elif m.type == Movement.MovementType.INITIAL:
            daily_net_delta[d] = daily_net_delta.get(d, Decimal("0.00")) + m.amount
        elif m.type == Movement.MovementType.ADJUSTMENT:
            daily_net_delta[d] = daily_net_delta.get(d, Decimal("0.00")) + m.amount
        elif m.type == Movement.MovementType.TRANSFER_IN and account_id is not None:
            daily_net_delta[d] = daily_net_delta.get(d, Decimal("0.00")) + m.amount
        elif m.type == Movement.MovementType.TRANSFER_OUT and account_id is not None:
            daily_net_delta[d] = daily_net_delta.get(d, Decimal("0.00")) - m.amount

    # Walk backwards from current_balance to compute end-of-day balance per day
    dates = [start_date + timedelta(days=i) for i in range((today - start_date).days + 1)]
    balances_by_day: dict[date, Decimal] = {}
    running = current_balance
    for d in reversed(dates):
        balances_by_day[d] = running
        running = (running - daily_net_delta.get(d, Decimal("0.00"))).quantize(Decimal("0.01"))

    return [
        {
            "date": d.isoformat(),
            "balance": str(balances_by_day[d].quantize(Decimal("0.01"))),
            "income": str(daily_income.get(d, Decimal("0.00")).quantize(Decimal("0.01"))),
            "expense": str(daily_expense.get(d, Decimal("0.00")).quantize(Decimal("0.01"))),
        }
        for d in dates
    ]
