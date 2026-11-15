from django.conf import settings
from django.db import models


class Category(models.Model):
    class CategoryType(models.TextChoices):
        INCOME = "INCOME", "Ingreso"
        EXPENSE = "EXPENSE", "Gasto"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
    )
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=10, choices=CategoryType.choices)
    color = models.CharField(max_length=7, default="#64748b")
    icon = models.CharField(max_length=40, default="tag")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["type", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name", "type"],
                name="unique_category_per_user_and_type",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.type})"
