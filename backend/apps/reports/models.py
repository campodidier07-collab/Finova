from django.conf import settings
from django.db import models


class ReportSnapshot(models.Model):
    class PeriodType(models.TextChoices):
        WEEKLY = "WEEKLY", "Semanal"
        MONTHLY = "MONTHLY", "Mensual"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="report_snapshots",
    )
    period_type = models.CharField(max_length=10, choices=PeriodType.choices)
    period_start = models.DateField()
    period_end = models.DateField()
    total_income = models.DecimalField(max_digits=14, decimal_places=2)
    total_expense = models.DecimalField(max_digits=14, decimal_places=2)
    net_balance = models.DecimalField(max_digits=14, decimal_places=2)
    movement_count = models.PositiveIntegerField(default=0)
    top_expense_categories = models.JSONField(default=list)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-period_start"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "period_type", "period_start"],
                name="unique_report_snapshot_per_user_period",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.period_type} {self.period_start}..{self.period_end}"
