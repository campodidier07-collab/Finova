from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import MovementFilter
from .models import Movement
from .serializers import MovementSerializer, ReverseMovementSerializer
from .services import LedgerError, reverse_movement


class MovementViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Append-only ledger endpoints: list, retrieve, create, and reverse."""

    serializer_class = MovementSerializer
    filterset_class = MovementFilter
    search_fields = ("description", "category__name")
    ordering_fields = ("occurred_at", "recorded_at", "amount")
    ordering = ("-recorded_at", "-id")

    def get_queryset(self):
        return (
            Movement.objects.select_related("account", "category")
            .prefetch_related("reversal")
            .filter(account__user=self.request.user)
        )

    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse(self, request, pk=None):
        serializer = ReverseMovementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reversal = reverse_movement(
                user=request.user,
                movement_id=int(pk),
                reason=serializer.validated_data.get("reason", ""),
            )
        except LedgerError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        out = self.get_serializer(reversal)
        return Response(out.data, status=status.HTTP_201_CREATED)
