from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.debts.models import Debt
from apps.subscriptions.models import Subscription

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="sync")
    def sync(self, request):
        today = timezone.now().date()
        soon = today + timedelta(days=5)
        created = 0

        due_subs = Subscription.objects.filter(
            user=request.user, is_active=True, next_billing_date__lte=soon
        )
        for sub in due_subs:
            key = f"sub-{sub.id}-{sub.next_billing_date.isoformat()}"
            _, was_created = Notification.objects.get_or_create(
                user=request.user,
                source_key=key,
                defaults={
                    "title": f"Próximo cobro: {sub.name}",
                    "message": f"Tu suscripción de {sub.amount} vence el {sub.next_billing_date.isoformat()}.",
                    "level": Notification.Level.WARNING,
                },
            )
            if was_created:
                created += 1

        due_debts = Debt.objects.filter(
            user=request.user, status=Debt.Status.ACTIVE, next_due_date__lte=soon
        )
        for debt in due_debts:
            key = f"debt-{debt.id}-{debt.next_due_date.isoformat()}"
            _, was_created = Notification.objects.get_or_create(
                user=request.user,
                source_key=key,
                defaults={
                    "title": f"Cuota próxima: {debt.counterparty}",
                    "message": f"Saldo pendiente: {debt.remaining_balance}. Fecha límite: {debt.next_due_date.isoformat()}.",
                    "level": Notification.Level.WARNING,
                },
            )
            if was_created:
                created += 1

        return Response({"created": created}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "Todas las notificaciones marcadas como leídas."})
