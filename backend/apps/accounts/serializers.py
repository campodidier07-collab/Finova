from decimal import Decimal

from rest_framework import serializers

from apps.ledger.services import create_account_with_initial_balance

from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    initial_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.00"),
        default=Decimal("0.00"),
    )

    class Meta:
        model = Account
        fields = (
            "id",
            "name",
            "currency",
            "initial_balance",
            "balance",
            "allow_overdraft",
            "created_at",
        )
        read_only_fields = ("id", "balance", "created_at")

    def create(self, validated_data: dict) -> Account:
        user = self.context["request"].user
        return create_account_with_initial_balance(
            user=user,
            name=validated_data.get("name", "Cuenta Principal"),
            currency=validated_data.get("currency", user.default_currency),
            initial_balance=validated_data.get("initial_balance", Decimal("0.00")),
            allow_overdraft=validated_data.get("allow_overdraft", False),
        )
