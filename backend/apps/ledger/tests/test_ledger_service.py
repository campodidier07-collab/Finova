from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from apps.categories.models import Category
from apps.ledger.models import Movement
from apps.ledger.services import (
    InsufficientFundsError,
    LedgerError,
    create_account_with_initial_balance,
    record_movement,
    record_transfer,
    reverse_movement,
)

User = get_user_model()


@pytest.mark.django_db
class TestLedgerService:
    def setup_method(self):
        self.user = User.objects.create_user(email="ana@finova.test", password="StrongPass123!")
        self.other_user = User.objects.create_user(email="bob@finova.test", password="StrongPass123!")
        self.income_cat = Category.objects.create(
            user=self.user, name="Salario", type=Category.CategoryType.INCOME
        )
        self.expense_cat = Category.objects.create(
            user=self.user, name="Alimentación", type=Category.CategoryType.EXPENSE
        )

    def test_create_account_with_initial_balance_logs_initial_movement(self):
        account = create_account_with_initial_balance(
            user=self.user,
            name="Cuenta Principal",
            currency="COP",
            initial_balance=Decimal("500000.00"),
        )
        assert account.balance == Decimal("500000.00")
        movements = Movement.objects.filter(account=account)
        assert movements.count() == 1
        m = movements.first()
        assert m.type == Movement.MovementType.INITIAL
        assert m.balance_before == Decimal("0.00")
        assert m.balance_after == Decimal("500000.00")

    def test_income_and_expense_update_balances_sequentially(self):
        account = create_account_with_initial_balance(
            user=self.user, initial_balance=Decimal("1000.00")
        )
        inc = record_movement(
            user=self.user,
            account_id=account.id,
            movement_type=Movement.MovementType.INCOME,
            amount=Decimal("250.50"),
            description="Pago freelance",
            category_id=self.income_cat.id,
        )
        assert inc.balance_before == Decimal("1000.00")
        assert inc.balance_after == Decimal("1250.50")

        exp = record_movement(
            user=self.user,
            account_id=account.id,
            movement_type=Movement.MovementType.EXPENSE,
            amount=Decimal("100.25"),
            description="Mercado",
            category_id=self.expense_cat.id,
        )
        assert exp.balance_before == Decimal("1250.50")
        assert exp.balance_after == Decimal("1150.25")

        account.refresh_from_db()
        assert account.balance == Decimal("1150.25")

    def test_insufficient_funds_raises_and_rolls_back(self):
        account = create_account_with_initial_balance(
            user=self.user, initial_balance=Decimal("100.00"), allow_overdraft=False
        )
        with pytest.raises(InsufficientFundsError):
            record_movement(
                user=self.user,
                account_id=account.id,
                movement_type=Movement.MovementType.EXPENSE,
                amount=Decimal("150.00"),
                description="Compra grande",
                category_id=self.expense_cat.id,
            )
        account.refresh_from_db()
        assert account.balance == Decimal("100.00")
        assert Movement.objects.filter(account=account, type=Movement.MovementType.EXPENSE).count() == 0

    def test_category_type_mismatch_raises(self):
        account = create_account_with_initial_balance(
            user=self.user, initial_balance=Decimal("100.00")
        )
        with pytest.raises(LedgerError, match="Category type does not match"):
            record_movement(
                user=self.user,
                account_id=account.id,
                movement_type=Movement.MovementType.INCOME,
                amount=Decimal("50.00"),
                description="Error de categoría",
                category_id=self.expense_cat.id,
            )

    def test_reverse_movement_restores_balance_and_blocks_double_reversal(self):
        account = create_account_with_initial_balance(
            user=self.user, initial_balance=Decimal("1000.00")
        )
        exp = record_movement(
            user=self.user,
            account_id=account.id,
            movement_type=Movement.MovementType.EXPENSE,
            amount=Decimal("200.00"),
            description="Error de cobro",
            category_id=self.expense_cat.id,
        )
        reversal = reverse_movement(user=self.user, movement_id=exp.id, reason="Duplicado")
        assert reversal.type == Movement.MovementType.ADJUSTMENT
        assert reversal.balance_before == Decimal("800.00")
        assert reversal.balance_after == Decimal("1000.00")

        account.refresh_from_db()
        assert account.balance == Decimal("1000.00")

        with pytest.raises(LedgerError, match="already been reversed"):
            reverse_movement(user=self.user, movement_id=exp.id)

    def test_other_user_cannot_record_on_foreign_account(self):
        account = create_account_with_initial_balance(
            user=self.user, initial_balance=Decimal("500.00")
        )
        with pytest.raises(LedgerError, match="Account not found"):
            record_movement(
                user=self.other_user,
                account_id=account.id,
                movement_type=Movement.MovementType.EXPENSE,
                amount=Decimal("50.00"),
                description="Intento no autorizado",
            )

    def test_record_transfer_updates_both_accounts_atomically(self):
        acc1 = create_account_with_initial_balance(
            user=self.user, name="Principal", initial_balance=Decimal("1000.00")
        )
        acc2 = create_account_with_initial_balance(
            user=self.user, name="Ahorros", initial_balance=Decimal("200.00")
        )
        out_mov, in_mov = record_transfer(
            user=self.user,
            from_account_id=acc1.id,
            to_account_id=acc2.id,
            amount=Decimal("300.00"),
            description="Ahorro quincenal",
        )
        assert out_mov.type == Movement.MovementType.TRANSFER_OUT
        assert out_mov.balance_before == Decimal("1000.00")
        assert out_mov.balance_after == Decimal("700.00")
        assert in_mov.type == Movement.MovementType.TRANSFER_IN
        assert in_mov.balance_before == Decimal("200.00")
        assert in_mov.balance_after == Decimal("500.00")

        acc1.refresh_from_db()
        acc2.refresh_from_db()
        assert acc1.balance == Decimal("700.00")
        assert acc2.balance == Decimal("500.00")
