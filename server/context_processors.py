from typing import TypedDict

from django.conf import settings
from django.http import HttpRequest

from products.models import MessageRecipient


class UserInfo(TypedDict):
    name: str
    is_superuser: bool
    is_authenticated: bool
    unread_message_count: int


class TContextProvider(TypedDict):
    user: UserInfo
    google_maps_js_api_key: str
    vapid_public_key: str


def context_provider(request: HttpRequest) -> TContextProvider:
    unread_message_count = (
        MessageRecipient.objects.filter(user=request.user, is_read=False).count()
        if request.user.is_authenticated
        else 0
    )

    return {
        "user": {
            "is_superuser": request.user.is_superuser,
            "name": request.user.get_username(),
            "is_authenticated": request.user.is_authenticated,
            "unread_message_count": unread_message_count,
        },
        "google_maps_js_api_key": settings.GOOGLE_MAPS_JS_API_KEY,
        "vapid_public_key": settings.VAPID_PUBLIC_KEY,
    }
