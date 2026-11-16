from decimal import Decimal

from rest_framework import serializers

from .models import Movement
from .services import LedgerError, record_movement


class MovementSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    category_color = serializers.CharField(source="category.color", read_only=True, default=None)
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_currency = serializers.CharField(source="account.currency", read_only=True)
    is_reversed = serializers.SerializerMethodField()

    class Meta:
        model = Movement
        fields = (
            "id",
            "account",
            "account_name",
            "account_currency",
            "category",
            "category_name",
            "category_color",
            "type",
            "amount",
            "balance_before",
            "balance_after",
            "description",
            "occurred_at",
            "recorded_at",
            "reversed_movement",
            "is_reversed",
        )
        read_only_fields = (
            "id",
            "account_name",
            "account_currency",
            "category_name",
            "category_color",
            "balance_before",
            "balance_after",
            "recorded_at",
            "reversed_movement",
            "is_reversed",
        )

    def get_is_reversed(self, obj: Movement) -> bool:
        return hasattr(obj, "reversal")

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("El valor debe ser mayor a cero.")
        return value

    def create(self, validated_data: dict) -> Movement:
        user = self.context["request"].user
        account = validated_data["account"]
        category = validated_data.get("category")
        try:
            return record_movement(
                user=user,
                account_id=account.id,
                movement_type=validated_data["type"],
                amount=validated_data["amount"],
                description=validated_data["description"],
                category_id=category.id if category else None,
                occurred_at=validated_data.get("occurred_at"),
            )
        except LedgerError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class ReverseMovementSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")


class TransferSerializer(serializers.Serializer):
    from_account = serializers.IntegerField()
    to_account = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    description = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    occurred_at = serializers.DateTimeField(required=False, allow_null=True)
