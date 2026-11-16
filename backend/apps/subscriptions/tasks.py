from celery import shared_task
from django.utils import timezone

from apps.ledger.models import Movement
from apps.ledger.services import LedgerError, record_movement

from .models import Subscription


@shared_task
def process_due_subscriptions() -> int:
    """Charge active subscriptions whose next_billing_date is today or earlier."""
    today = timezone.now().date()
    charged = 0
    due = Subscription.objects.select_related("user", "account").filter(
        is_active=True, next_billing_date__lte=today
    )
    for sub in due:
        try:
            record_movement(
                user=sub.user,
                account_id=sub.account_id,
                movement_type=Movement.MovementType.EXPENSE,
                amount=sub.amount,
                description=f"Suscripción automática: {sub.name}",
                category_id=sub.category_id,
            )
            sub.next_billing_date = sub.advance_next_billing_date()
            sub.save(update_fields=["next_billing_date"])
            charged += 1
        except LedgerError:
            continue
    return charged
