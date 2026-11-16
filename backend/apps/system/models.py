from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Level(models.TextChoices):
        INFO = "INFO", "Información"
        WARNING = "WARNING", "Alerta"
        SUCCESS = "SUCCESS", "Éxito"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=140)
    message = models.CharField(max_length=255)
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    source_key = models.CharField(max_length=120, blank=True, db_index=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["is_read", "-created_at"]
