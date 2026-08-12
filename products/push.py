import json
import logging

from django.conf import settings
from django.utils import timezone
from pywebpush import WebPushException, webpush

from .models import Message, MessageRecipient, MessageRecipientPushDelivery, PushSubscription

logger = logging.getLogger("main_logger")

# Push services return one of these when a subscription is no longer valid (user revoked
# permission, uninstalled the PWA, etc) - safe to delete rather than keep retrying forever.
_EXPIRED_SUBSCRIPTION_STATUS_CODES = {404, 410}


def send_push_to_users(message: Message, user_ids: list[int]) -> None:
    """
    Push a notification for `message` to every PushSubscription belonging to the given
    users, recording one MessageRecipientPushDelivery per (MessageRecipient, PushSubscription)
    pair attempted. Best-effort per subscription: one device's failure doesn't affect
    delivery to the user's other devices, or to other users.
    """
    subscriptions = list(PushSubscription.objects.filter(user_id__in=user_ids))
    if not subscriptions:
        return

    # user_id -> MessageRecipient
    message_recipients_by_user_id = {
        mr.user_id: mr
        for mr in MessageRecipient.objects.filter(message=message, user_id__in=user_ids)
    }

    # send the same payload to every subscription, since a message's body_md would display
    # on the user's device as raw markdown
    payload = json.dumps({"title": message.title, "body": "You have a new message."})
    expired_subscription_ids: list[int] = []

    for subscription in subscriptions:
        message_recipient = message_recipients_by_user_id.get(subscription.user_id)
        if message_recipient is None:
            continue

        delivery = MessageRecipientPushDelivery(
            message_recipient=message_recipient, push_subscription=subscription
        )

        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh_key, "auth": subscription.auth_key},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"},
            )
        except WebPushException as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            delivery.failed_at = timezone.now()
            delivery.error = str(exc)
            logger.warning("Push delivery failed for subscription %s: %s", subscription.id, exc)
            if status_code in _EXPIRED_SUBSCRIPTION_STATUS_CODES:
                expired_subscription_ids.append(subscription.id)
        except Exception as exc:
            # one subscription's failure (network error, malformed key, etc) must never
            # abort delivery to the rest of the batch
            delivery.failed_at = timezone.now()
            delivery.error = str(exc)
            logger.exception("Unexpected error pushing to subscription %s", subscription.id)
        else:
            delivery.delivered_at = timezone.now()

        delivery.save()

    if expired_subscription_ids:
        PushSubscription.objects.filter(id__in=expired_subscription_ids).delete()
