from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.ledger.models import Movement
from apps.ledger.services import LedgerError, record_movement

from .models import Debt, DebtPayment
from .serializers import DebtSerializer, RegisterDebtPaymentSerializer


class DebtViewSet(viewsets.ModelViewSet):
    serializer_class = DebtSerializer

    def get_queryset(self):
        return Debt.objects.prefetch_related("payments").filter(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="pay")
    @transaction.atomic
    def pay(self, request, pk=None):
        debt = Debt.objects.select_for_update().filter(id=pk, user=request.user).first()
        if debt is None:
            return Response({"detail": "Deuda no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if debt.status == Debt.Status.PAID:
            return Response(
                {"detail": "Esta deuda ya está completamente pagada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegisterDebtPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]
        account_id = serializer.validated_data.get("account")
        notes = serializer.validated_data.get("notes", "")

        movement = None
        if account_id is not None:
            mov_type = (
                Movement.MovementType.EXPENSE
                if debt.direction == Debt.Direction.PAYABLE
                else Movement.MovementType.INCOME
            )
            prefix = "Pago de deuda" if debt.direction == Debt.Direction.PAYABLE else "Cobro de préstamo"
            try:
                movement = record_movement(
                    user=request.user,
                    account_id=account_id,
                    movement_type=mov_type,
                    amount=amount,
                    description=f"{prefix}: {debt.counterparty}",
                )
            except LedgerError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        debt.paid_installments += 1
        debt.remaining_balance = max(Decimal("0.00"), debt.remaining_balance - amount)
        if debt.remaining_balance == Decimal("0.00"):
            debt.status = Debt.Status.PAID
        else:
            debt.next_due_date = debt.next_due_date + timedelta(days=30)
        debt.save(update_fields=["paid_installments", "remaining_balance", "status", "next_due_date"])

        DebtPayment.objects.create(
            debt=debt,
            amount=amount,
            installment_number=debt.paid_installments,
            movement=movement,
            notes=notes,
        )
        return Response(self.get_serializer(debt).data, status=status.HTTP_201_CREATED)
