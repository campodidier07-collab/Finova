from decimal import Decimal

from rest_framework import serializers

from .models import Debt, DebtPayment


class DebtPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtPayment
        fields = ("id", "amount", "installment_number", "movement", "notes", "paid_at")


class DebtSerializer(serializers.ModelSerializer):
    payments = DebtPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Debt
        fields = (
            "id",
            "direction",
            "counterparty",
            "description",
            "principal_amount",
            "interest_rate",
            "total_installments",
            "paid_installments",
            "remaining_balance",
            "next_due_date",
            "status",
            "payments",
            "created_at",
        )
        read_only_fields = ("id", "paid_installments", "remaining_balance", "status", "created_at")

    def validate_principal_amount(self, value: Decimal) -> Decimal:
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("El monto principal debe ser mayor a cero.")
        return value

    def create(self, validated_data: dict) -> Debt:
        principal = validated_data["principal_amount"]
        interest_rate = validated_data.get("interest_rate", Decimal("0.00"))
        total_with_interest = (
            principal * (Decimal("1.00") + (interest_rate / Decimal("100.00")))
        ).quantize(Decimal("0.01"))
        validated_data["user"] = self.context["request"].user
        validated_data["remaining_balance"] = total_with_interest
        return super().create(validated_data)


class RegisterDebtPaymentSerializer(serializers.Serializer):
    account = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    notes = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
