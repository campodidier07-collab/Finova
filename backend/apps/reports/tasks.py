from decimal import Decimal

from celery import shared_task
from django.contrib.auth import get_user_model

from .models import ReportSnapshot
from .services import compute_period_report, get_period_bounds

User = get_user_model()


@shared_task
def generate_periodic_reports(period_type: str = "WEEKLY") -> int:
    """Generate or update ReportSnapshot records for all active users."""
    processed = 0
    for user in User.objects.filter(is_active=True).iterator():
        tz_name = user.timezone or "America/Bogota"
        start_d, end_d, start_dt, end_dt = get_period_bounds(period_type, tz_name=tz_name)
        data = compute_period_report(user=user, start_dt=start_dt, end_dt=end_dt)

        ReportSnapshot.objects.update_or_create(
            user=user,
            period_type=period_type,
            period_start=start_d,
            defaults={
                "period_end": end_d,
                "total_income": Decimal(data["total_income"]),
                "total_expense": Decimal(data["total_expense"]),
                "net_balance": Decimal(data["net_balance"]),
                "movement_count": data["movement_count"],
                "top_expense_categories": data["top_expense_categories"],
            },
        )
        processed += 1
    return processed
