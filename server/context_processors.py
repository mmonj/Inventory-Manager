from typing import Optional, TypedDict

from django.http import HttpRequest

from survey_worker.models import GlobalSettings


class UserInfo(TypedDict):
    name: str
    is_superuser: bool
    is_authenticated: bool


class TGlobalSettings(TypedDict):
    is_survey_launcher_enabled: bool


class TContextProvider(TypedDict):
    user: UserInfo
    global_settings: Optional[TGlobalSettings]


def context_provider(request: HttpRequest) -> TContextProvider:
    global_settings = GlobalSettings.objects.first()

    return {
        "user": {
            "is_superuser": request.user.is_superuser,
            "name": request.user.get_username(),
            "is_authenticated": request.user.is_authenticated,
        },
        "global_settings": (
            {"is_survey_launcher_enabled": global_settings.is_survey_launcher_enabled}
            if global_settings is not None
            else None
        ),
    }
