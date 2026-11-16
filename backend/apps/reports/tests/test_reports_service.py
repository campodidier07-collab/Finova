from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.categories.models import Category
from apps.ledger.models import Movement
from apps.ledger.services import create_account_with_initial_balance, record_movement
from apps.reports.models import ReportSnapshot
from apps.reports.services import (
    compute_period_report,
    get_balance_trend,
    get_dashboard_summary,
    get_period_bounds,
)
from apps.reports.tasks import generate_periodic_reports

User = get_user_model()


@pytest.mark.django_db
class TestReportsService:
    def setup_method(self):
        self.user = User.objects.create_user(email="rep@finova.test", password="StrongPass123!")
        self.account = create_account_with_initial_balance(
            user=self.user, initial_balance=Decimal("1000.00")
        )
        self.cat_salary = Category.objects.create(
            user=self.user, name="Salario", type=Category.CategoryType.INCOME
        )
        self.cat_food = Category.objects.create(
            user=self.user, name="Alimentación", type=Category.CategoryType.EXPENSE, color="#ea580c"
        )
        self.cat_transport = Category.objects.create(
            user=self.user, name="Transporte", type=Category.CategoryType.EXPENSE, color="#d97706"
        )

    def test_compute_period_report_and_dashboard_summary(self):
        record_movement(
            user=self.user,
            account_id=self.account.id,
            movement_type=Movement.MovementType.INCOME,
            amount=Decimal("2000.00"),
            description="Nómina",
            category_id=self.cat_salary.id,
        )
        record_movement(
            user=self.user,
            account_id=self.account.id,
            movement_type=Movement.MovementType.EXPENSE,
            amount=Decimal("300.00"),
            description="Supermercado",
            category_id=self.cat_food.id,
        )
        record_movement(
            user=self.user,
            account_id=self.account.id,
            movement_type=Movement.MovementType.EXPENSE,
            amount=Decimal("100.00"),
            description="Bus",
            category_id=self.cat_transport.id,
        )

        _, _, start_dt, end_dt = get_period_bounds("MONTHLY", tz_name=self.user.timezone)
        report = compute_period_report(user=self.user, start_dt=start_dt, end_dt=end_dt)

        assert Decimal(report["total_income"]) == Decimal("2000.00")
        assert Decimal(report["total_expense"]) == Decimal("400.00")
        assert Decimal(report["net_balance"]) == Decimal("1600.00")
        assert report["movement_count"] == 3
        assert report["top_expense_categories"][0]["category_name"] == "Alimentación"

        dashboard = get_dashboard_summary(user=self.user)
        assert Decimal(dashboard["total_balance"]) == Decimal("2600.00")
        assert "today" in dashboard["summaries"]
        assert "week" in dashboard["summaries"]
        assert "month" in dashboard["summaries"]

    def test_generate_periodic_reports_task_is_idempotent(self):
        record_movement(
            user=self.user,
            account_id=self.account.id,
            movement_type=Movement.MovementType.EXPENSE,
            amount=Decimal("50.00"),
            description="Café",
            category_id=self.cat_food.id,
        )
        count1 = generate_periodic_reports("WEEKLY")
        count2 = generate_periodic_reports("WEEKLY")
        assert count1 == 1
        assert count2 == 1
        assert ReportSnapshot.objects.filter(user=self.user, period_type="WEEKLY").count() == 1

    def test_get_balance_trend_returns_daily_series(self):
        record_movement(
            user=self.user,
            account_id=self.account.id,
            movement_type=Movement.MovementType.INCOME,
            amount=Decimal("500.00"),
            description="Ingreso",
            category_id=self.cat_salary.id,
        )
        series = get_balance_trend(user=self.user, days=7)
        assert len(series) == 7
        assert Decimal(series[-1]["balance"]) == Decimal("1500.00")
        assert Decimal(series[-1]["income"]) == Decimal("500.00")
