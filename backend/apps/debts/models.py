from decimal import Decimal

from django.conf import settings
from django.db import models


class Debt(models.Model):
    class Direction(models.TextChoices):
        PAYABLE = "PAYABLE", "Debo (Préstamo recibido)"
        RECEIVABLE = "RECEIVABLE", "Me deben (Préstamo otorgado)"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Activa"
        PAID = "PAID", "Pagada"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="debts",
    )
    direction = models.CharField(
        max_length=12,
        choices=Direction.choices,
        default=Direction.PAYABLE,
    )
    counterparty = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    total_installments = models.PositiveIntegerField(default=1)
    paid_installments = models.PositiveIntegerField(default=0)
    remaining_balance = models.DecimalField(max_digits=14, decimal_places=2)
    next_due_date = models.DateField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["status", "next_due_date"]

    def __str__(self) -> str:
        return f"{self.counterparty} ({self.remaining_balance})"


class DebtPayment(models.Model):
    debt = models.ForeignKey(Debt, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    installment_number = models.PositiveIntegerField()
    movement = models.ForeignKey(
        "ledger.Movement",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debt_payments",
    )
    notes = models.CharField(max_length=200, blank=True)
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at"]
