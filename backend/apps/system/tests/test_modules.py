from datetime import date, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestNewModulesAPI:
    def _auth_client(self):
        client = APIClient()
        client.post(
            "/api/auth/register/",
            {
                "email": "mod@finova.test",
                "full_name": "Mod Tester",
                "password": "FinovaSecurePass2026!",
                "default_currency": "COP",
            },
            format="json",
        )
        login = client.post(
            "/api/auth/login/",
            {"email": "mod@finova.test", "password": "FinovaSecurePass2026!"},
            format="json",
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        acc = client.post(
            "/api/accounts/",
            {"name": "Principal", "currency": "COP", "initial_balance": "500000.00"},
            format="json",
        )
        return client, acc.data["id"]

    def test_subscription_charge_and_notification_sync(self):
        client, account_id = self._auth_client()
        tomorrow = (timezone.now().date() + timedelta(days=1)).isoformat()

        sub = client.post(
            "/api/subscriptions/",
            {
                "account": account_id,
                "name": "Netflix",
                "amount": "45000.00",
                "billing_cycle": "MONTHLY",
                "next_billing_date": tomorrow,
            },
            format="json",
        )
        assert sub.status_code == status.HTTP_201_CREATED
        sub_id = sub.data["id"]

        # Sync notifications picks up upcoming subscription
        sync = client.post("/api/system/notifications/sync/")
        assert sync.status_code == status.HTTP_200_OK
        assert sync.data["created"] >= 1

        # Charge subscription deducts from account and advances date
        charge = client.post(f"/api/subscriptions/{sub_id}/charge/")
        assert charge.status_code == status.HTTP_201_CREATED
        assert charge.data["subscription"]["next_billing_date"] != tomorrow

        acc = client.get(f"/api/accounts/{account_id}/")
        assert acc.data["balance"] == "455000.00"

    def test_debt_creation_and_installment_payment(self):
        client, account_id = self._auth_client()
        due = (date.today() + timedelta(days=2)).isoformat()

        debt = client.post(
            "/api/debts/",
            {
                "direction": "PAYABLE",
                "counterparty": "Banco Finova",
                "description": "Crédito personal",
                "principal_amount": "100000.00",
                "interest_rate": "10.00",
                "total_installments": 2,
                "next_due_date": due,
            },
            format="json",
        )
        assert debt.status_code == status.HTTP_201_CREATED
        assert debt.data["remaining_balance"] == "110000.00"
        debt_id = debt.data["id"]

        pay = client.post(
            f"/api/debts/{debt_id}/pay/",
            {"account": account_id, "amount": "110000.00", "notes": "Liquidación total"},
            format="json",
        )
        assert pay.status_code == status.HTTP_201_CREATED
        assert pay.data["status"] == "PAID"
        assert pay.data["remaining_balance"] == "0.00"

    def test_receipt_upload_and_change_password(self):
        client, account_id = self._auth_client()
        receipt = SimpleUploadedFile("factura.txt", b"Factura #1234", content_type="text/plain")
        mov = client.post(
            "/api/movements/",
            {
                "account": account_id,
                "type": "EXPENSE",
                "amount": "15000.00",
                "description": "Compra con factura",
                "receipt": receipt,
            },
            format="multipart",
        )
        assert mov.status_code == status.HTTP_201_CREATED
        assert mov.data["receipt"] is not None

        # Filter has_receipt=true and test attach-receipt on a second movement
        filtered = client.get("/api/movements/?has_receipt=true")
        assert filtered.status_code == status.HTTP_200_OK
        assert filtered.data["count"] == 1

        mov2 = client.post(
            "/api/movements/",
            {
                "account": account_id,
                "type": "EXPENSE",
                "amount": "5000.00",
                "description": "Sin factura inicial",
            },
            format="json",
        )
        assert mov2.status_code == status.HTTP_201_CREATED
        attach = client.post(
            f"/api/movements/{mov2.data['id']}/attach-receipt/",
            {"receipt": SimpleUploadedFile("ticket.jpg", b"JPGDATA", content_type="image/jpeg")},
            format="multipart",
        )
        assert attach.status_code == status.HTTP_200_OK
        assert attach.data["receipt"] is not None

        pwd = client.post(
            "/api/auth/change-password/",
            {
                "current_password": "FinovaSecurePass2026!",
                "new_password": "NewFinovaPass2026!",
            },
            format="json",
        )
        assert pwd.status_code == status.HTTP_200_OK
