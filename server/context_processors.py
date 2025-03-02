from typing import Literal, Optional, TypedDict

from django.http import HttpRequest
from reactivated import Pick

from survey_worker.models import GlobalSettings


class UserInfo(TypedDict):
    name: str
    is_superuser: bool
    is_authenticated: bool


class TContextProvider(TypedDict):
    user: UserInfo
    global_settings: Optional[Pick[GlobalSettings, Literal["is_survey_launcher_enabled"]]]


def context_provider(request: HttpRequest) -> TContextProvider:
    return {
        "user": {
            "is_superuser": request.user.is_superuser,
            "name": request.user.get_username(),
            "is_authenticated": request.user.is_authenticated,
        },
        "global_settings": GlobalSettings.objects.first(),
    }
