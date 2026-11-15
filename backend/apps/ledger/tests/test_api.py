import pytest
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestFinovaAPIFlow:
    def test_full_jwt_account_movement_audit_and_report_flow(self):
        call_command("seed_categories")
        client = APIClient()

        # 1. Register
        reg = client.post(
            "/api/auth/register/",
            {
                "email": "jean@finova.test",
                "full_name": "Jean",
                "password": "FinovaSecurePass2026!",
                "default_currency": "COP",
            },
            format="json",
        )
        assert reg.status_code == status.HTTP_201_CREATED

        # 2. Login JWT
        login = client.post(
            "/api/auth/login/",
            {"email": "jean@finova.test", "password": "FinovaSecurePass2026!"},
            format="json",
        )
        assert login.status_code == status.HTTP_200_OK
        token = login.data["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # 3. Create Account with initial balance
        acc_res = client.post(
            "/api/accounts/",
            {"name": "Cuenta Principal", "currency": "COP", "initial_balance": "100000.00"},
            format="json",
        )
        assert acc_res.status_code == status.HTTP_201_CREATED
        account_id = acc_res.data["id"]

        # 4. Fetch categories
        cats = client.get("/api/categories/")
        assert cats.status_code == status.HTTP_200_OK
        income_cat = next(c for c in cats.data["results"] if c["type"] == "INCOME")
        expense_cat = next(c for c in cats.data["results"] if c["type"] == "EXPENSE")

        # 5. Record Income & Expense
        inc_res = client.post(
            "/api/movements/",
            {
                "account": account_id,
                "category": income_cat["id"],
                "type": "INCOME",
                "amount": "50000.00",
                "description": "Bono mensual",
            },
            format="json",
        )
        assert inc_res.status_code == status.HTTP_201_CREATED
        assert inc_res.data["balance_before"] == "100000.00"
        assert inc_res.data["balance_after"] == "150000.00"

        exp_res = client.post(
            "/api/movements/",
            {
                "account": account_id,
                "category": expense_cat["id"],
                "type": "EXPENSE",
                "amount": "20000.00",
                "description": "Almuerzo",
            },
            format="json",
        )
        assert exp_res.status_code == status.HTTP_201_CREATED
        assert exp_res.data["balance_before"] == "150000.00"
        assert exp_res.data["balance_after"] == "130000.00"

        # 6. Search & Filter audit log
        filtered = client.get("/api/movements/?search=Almuerzo&type=EXPENSE")
        assert filtered.status_code == status.HTTP_200_OK
        assert filtered.data["count"] == 1

        # 7. Dashboard & Reports
        dash = client.get("/api/reports/dashboard/")
        assert dash.status_code == status.HTTP_200_OK
        assert dash.data["total_balance"] == "130000.00"

        rep = client.get("/api/reports/period/?period_type=MONTHLY")
        assert rep.status_code == status.HTTP_200_OK
        assert rep.data["total_income"] == "50000.00"
        assert rep.data["total_expense"] == "20000.00"
        assert rep.data["net_balance"] == "30000.00"
