from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.ledger.models import Movement
from apps.ledger.services import LedgerError, record_movement

from .models import Subscription
from .serializers import SubscriptionSerializer


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return Subscription.objects.select_related("account", "category").filter(
            user=self.request.user
        )

    @action(detail=True, methods=["post"], url_path="charge")
    @transaction.atomic
    def charge(self, request, pk=None):
        sub = self.get_object()
        try:
            movement = record_movement(
                user=request.user,
                account_id=sub.account_id,
                movement_type=Movement.MovementType.EXPENSE,
                amount=sub.amount,
                description=f"Suscripción: {sub.name}",
                category_id=sub.category_id,
            )
        except LedgerError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sub.next_billing_date = sub.advance_next_billing_date()
        sub.save(update_fields=["next_billing_date"])

        return Response(
            {
                "subscription": self.get_serializer(sub).data,
                "movement_id": movement.id,
            },
            status=status.HTTP_201_CREATED,
        )
