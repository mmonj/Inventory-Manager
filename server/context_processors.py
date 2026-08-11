from typing import TypedDict

from django.conf import settings
from django.http import HttpRequest

from products.models import MessageRecipient
from survey_worker.models import GlobalSettings


class UserInfo(TypedDict):
    name: str
    is_superuser: bool
    is_authenticated: bool
    unread_message_count: int


class TGlobalSettings(TypedDict):
    is_survey_launcher_enabled: bool


class TContextProvider(TypedDict):
    user: UserInfo
    global_settings: TGlobalSettings | None
    google_maps_js_api_key: str


def context_provider(request: HttpRequest) -> TContextProvider:
    global_settings = GlobalSettings.objects.first()

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
        "global_settings": (
            {"is_survey_launcher_enabled": global_settings.is_survey_launcher_enabled}
            if global_settings is not None
            else None
        ),
        "google_maps_js_api_key": settings.GOOGLE_MAPS_JS_API_KEY,
    }
