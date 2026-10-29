from typing import Literal, TypedDict

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone

from products.models import MessageRecipient
from server.models import GlobalSettings


class UserInfo(TypedDict):
    name: str
    is_superuser: bool
    is_authenticated: bool
    unread_message_count: int


class QtMode(TypedDict):
    mode: Literal["fake", "live"]
    # "HH:MM" in the server's local time, filled in only while live
    live_until_time: str | None


class TContextProvider(TypedDict):
    user: UserInfo
    # None in production, which always talks to the real Qt and shows no banner
    qt_mode: QtMode | None
    google_maps_js_api_key: str
    vapid_public_key: str


def get_qt_mode() -> QtMode | None:
    if not settings.DEBUG:
        return None

    global_settings = GlobalSettings.load()
    if not global_settings.is_qt_live_window_open():
        return {"mode": "fake", "live_until_time": None}

    live_until_time = timezone.localtime(global_settings.qt_live_until).strftime("%H:%M")
    return {"mode": "live", "live_until_time": live_until_time}


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
        "qt_mode": get_qt_mode(),
        "google_maps_js_api_key": settings.GOOGLE_MAPS_JS_API_KEY,
        "vapid_public_key": settings.VAPID_PUBLIC_KEY,
    }
