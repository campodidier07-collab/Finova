from django.db import models
from django.utils import timezone


class Movement(models.Model):
    class MovementType(models.TextChoices):
        INITIAL = "INITIAL", "Saldo inicial"
        INCOME = "INCOME", "Ingreso"
        EXPENSE = "EXPENSE", "Gasto"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste / Reversión"

    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="movements",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="movements",
    )
    type = models.CharField(max_length=12, choices=MovementType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    balance_before = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=255)
    occurred_at = models.DateTimeField(default=timezone.now)
    recorded_at = models.DateTimeField(auto_now_add=True)
    reversed_movement = models.OneToOneField(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reversal",
    )

    class Meta:
        ordering = ["-recorded_at", "-id"]
        indexes = [
            models.Index(fields=["account", "-recorded_at"]),
            models.Index(fields=["account", "-occurred_at"]),
            models.Index(fields=["account", "type"]),
        ]

    def __str__(self) -> str:
        return f"[{self.type}] {self.amount} ({self.balance_before} -> {self.balance_after})"
