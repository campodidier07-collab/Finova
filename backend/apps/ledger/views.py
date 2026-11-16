from django.http import HttpResponse
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.reports.excel import build_audit_xlsx

from .filters import MovementFilter
from .models import Movement
from .serializers import MovementSerializer, ReverseMovementSerializer, TransferSerializer
from .services import LedgerError, record_transfer, reverse_movement


class MovementViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Append-only ledger endpoints: list, retrieve, create, and reverse."""

    serializer_class = MovementSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
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

    @action(detail=False, methods=["post"], url_path="transfer")
    def transfer(self, request):
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            out_mov, in_mov = record_transfer(
                user=request.user,
                from_account_id=serializer.validated_data["from_account"],
                to_account_id=serializer.validated_data["to_account"],
                amount=serializer.validated_data["amount"],
                description=serializer.validated_data.get("description", ""),
                occurred_at=serializer.validated_data.get("occurred_at"),
            )
        except LedgerError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "outgoing": self.get_serializer(out_mov).data,
                "incoming": self.get_serializer(in_mov).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request):
        queryset = self.filter_queryset(self.get_queryset())[:2000]
        xlsx_bytes = build_audit_xlsx(user=request.user, movements=queryset)
        response = HttpResponse(
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="finova-auditoria.xlsx"'
        return response
