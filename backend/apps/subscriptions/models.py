from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models


class Subscription(models.Model):
    class BillingCycle(models.TextChoices):
        WEEKLY = "WEEKLY", "Semanal"
        MONTHLY = "MONTHLY", "Mensual"
        YEARLY = "YEARLY", "Anual"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions",
    )
    name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    billing_cycle = models.CharField(
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY,
    )
    next_billing_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["next_billing_date", "name"]

    def advance_next_billing_date(self) -> date:
        d = self.next_billing_date
        if self.billing_cycle == self.BillingCycle.WEEKLY:
            return d + timedelta(days=7)
        if self.billing_cycle == self.BillingCycle.YEARLY:
            try:
                return d.replace(year=d.year + 1)
            except ValueError:
                return d.replace(year=d.year + 1, day=28)
        # MONTHLY
        month = d.month + 1
        year = d.year
        if month > 12:
            month = 1
            year += 1
        day = min(d.day, 28)
        return date(year, month, day)

    @property
    def monthly_equivalent(self) -> Decimal:
        if self.billing_cycle == self.BillingCycle.WEEKLY:
            return (self.amount * Decimal("4.33")).quantize(Decimal("0.01"))
        if self.billing_cycle == self.BillingCycle.YEARLY:
            return (self.amount / Decimal("12")).quantize(Decimal("0.01"))
        return self.amount
