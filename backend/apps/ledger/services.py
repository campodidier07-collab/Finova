from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import Account
from apps.categories.models import Category

from .models import Movement


class LedgerError(Exception):
    """Base domain error for ledger operations."""


class InsufficientFundsError(LedgerError):
    """Raised when an expense exceeds available balance and overdraft is disabled."""


@transaction.atomic
def create_account_with_initial_balance(
    *,
    user,
    name: str = "Cuenta Principal",
    currency: str = "COP",
    initial_balance: Decimal = Decimal("0.00"),
    allow_overdraft: bool = False,
) -> Account:
    """Create an account and record its initial balance in the audit ledger."""
    if initial_balance < Decimal("0.00"):
        raise LedgerError("Initial balance cannot be negative.")

    account = Account.objects.create(
        user=user,
        name=name,
        currency=currency.upper(),
        initial_balance=initial_balance,
        balance=initial_balance,
        allow_overdraft=allow_overdraft,
    )

    if initial_balance > Decimal("0.00"):
        Movement.objects.create(
            account=account,
            category=None,
            type=Movement.MovementType.INITIAL,
            amount=initial_balance,
            balance_before=Decimal("0.00"),
            balance_after=initial_balance,
            description=f"Saldo inicial de {account.name}",
            occurred_at=timezone.now(),
        )

    return account


@transaction.atomic
def record_movement(
    *,
    user,
    account_id: int,
    movement_type: str,
    amount: Decimal,
    description: str,
    category_id: int | None = None,
    occurred_at: datetime | None = None,
) -> Movement:
    """Atomically record an income or expense and update the account balance."""
    if amount <= Decimal("0.00"):
        raise LedgerError("Movement amount must be greater than zero.")

    if movement_type not in (Movement.MovementType.INCOME, Movement.MovementType.EXPENSE):
        raise LedgerError("Only INCOME and EXPENSE movements can be recorded directly.")

    account = Account.objects.select_for_update().filter(id=account_id, user=user).first()
    if account is None:
        raise LedgerError("Account not found.")

    category = None
    if category_id is not None:
        category = Category.objects.filter(
            Q(id=category_id) & (Q(user=user) | Q(user__isnull=True, is_default=True))
        ).first()
        if category is None:
            raise LedgerError("Category not found.")
        if category.type != movement_type:
            raise LedgerError("Category type does not match movement type.")

    balance_before = account.balance
    if movement_type == Movement.MovementType.INCOME:
        balance_after = balance_before + amount
    else:
        balance_after = balance_before - amount
        if balance_after < Decimal("0.00") and not account.allow_overdraft:
            raise InsufficientFundsError(
                f"Saldo insuficiente. Disponible: {balance_before} {account.currency}."
            )

    movement = Movement.objects.create(
        account=account,
        category=category,
        type=movement_type,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        description=description.strip(),
        occurred_at=occurred_at or timezone.now(),
    )

    account.balance = balance_after
    account.save(update_fields=["balance"])
    return movement


@transaction.atomic
def reverse_movement(*, user, movement_id: int, reason: str = "") -> Movement:
    """Create a compensating adjustment entry to reverse a prior movement."""
    original = (
        Movement.objects.select_related("account")
        .filter(id=movement_id, account__user=user)
        .first()
    )
    if original is None:
        raise LedgerError("Movement not found.")

    if original.type in (Movement.MovementType.INITIAL, Movement.MovementType.ADJUSTMENT):
        raise LedgerError("Initial or adjustment movements cannot be reversed.")

    if hasattr(original, "reversal"):
        raise LedgerError("This movement has already been reversed.")

    account = Account.objects.select_for_update().get(id=original.account_id)
    balance_before = account.balance

    if original.type == Movement.MovementType.INCOME:
        delta = -original.amount
        balance_after = balance_before + delta
        if balance_after < Decimal("0.00") and not account.allow_overdraft:
            raise InsufficientFundsError(
                "No se puede revertir este ingreso porque dejaría la cuenta en saldo negativo."
            )
    else:
        delta = original.amount
        balance_after = balance_before + delta

    desc = f"Reversión de #{original.id}: {original.description}"
    if reason.strip():
        desc = f"{desc} ({reason.strip()})"

    reversal = Movement.objects.create(
        account=account,
        category=original.category,
        type=Movement.MovementType.ADJUSTMENT,
        amount=delta,
        balance_before=balance_before,
        balance_after=balance_after,
        description=desc[:255],
        occurred_at=timezone.now(),
        reversed_movement=original,
    )

    account.balance = balance_after
    account.save(update_fields=["balance"])
    return reversal


@transaction.atomic
def record_transfer(
    *,
    user,
    from_account_id: int,
    to_account_id: int,
    amount: Decimal,
    description: str = "",
    occurred_at: datetime | None = None,
) -> tuple[Movement, Movement]:
    """Atomically transfer funds between two accounts owned by the user."""
    if amount <= Decimal("0.00"):
        raise LedgerError("El monto de la transferencia debe ser mayor a cero.")
    if from_account_id == to_account_id:
        raise LedgerError("La cuenta de origen y destino deben ser diferentes.")

    # Lock accounts in deterministic ID order to prevent deadlocks
    locked_accounts = list(
        Account.objects.select_for_update()
        .filter(user=user, id__in=[from_account_id, to_account_id])
        .order_by("id")
    )
    if len(locked_accounts) != 2:
        raise LedgerError("Una o ambas cuentas no existen o no te pertenecen.")

    accounts_by_id = {acc.id: acc for acc in locked_accounts}
    source = accounts_by_id[from_account_id]
    target = accounts_by_id[to_account_id]

    if source.currency != target.currency:
        raise LedgerError("Solo se permiten transferencias entre cuentas de la misma moneda.")

    source_before = source.balance
    source_after = source_before - amount
    if source_after < Decimal("0.00") and not source.allow_overdraft:
        raise InsufficientFundsError(
            f"Saldo insuficiente en {source.name}. Disponible: {source_before} {source.currency}."
        )

    target_before = target.balance
    target_after = target_before + amount
    event_time = occurred_at or timezone.now()
    note = description.strip() or f"Transferencia de {source.name} a {target.name}"

    out_mov = Movement.objects.create(
        account=source,
        category=None,
        type=Movement.MovementType.TRANSFER_OUT,
        amount=amount,
        balance_before=source_before,
        balance_after=source_after,
        description=f"Hacia {target.name}: {note}"[:255],
        occurred_at=event_time,
    )
    in_mov = Movement.objects.create(
        account=target,
        category=None,
        type=Movement.MovementType.TRANSFER_IN,
        amount=amount,
        balance_before=target_before,
        balance_after=target_after,
        description=f"Desde {source.name}: {note}"[:255],
        occurred_at=event_time,
    )

    source.balance = source_after
    target.balance = target_after
    source.save(update_fields=["balance"])
    target.save(update_fields=["balance"])
    return out_mov, in_mov
