from decimal import Decimal

from rest_framework import serializers

from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_currency = serializers.CharField(source="account.currency", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    monthly_equivalent = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = Subscription
        fields = (
            "id",
            "account",
            "account_name",
            "account_currency",
            "category",
            "category_name",
            "name",
            "amount",
            "billing_cycle",
            "next_billing_date",
            "is_active",
            "monthly_equivalent",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("El monto debe ser mayor a cero.")
        return value

    def validate_account(self, account):
        if account.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("La cuenta no te pertenece.")
        return account

    def create(self, validated_data: dict) -> Subscription:
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
