from collections.abc import Callable
from functools import wraps
from typing import Any

from django.core.exceptions import PermissionDenied
from django.http import HttpRequest, HttpResponse
from rest_framework.permissions import BasePermission
from rest_framework.request import Request as DrfRequest


class IsSuperuser(BasePermission):
    def has_permission(self, request: DrfRequest, view: Any) -> bool:  # noqa: ARG002
        return bool(request.user and request.user.is_superuser)


def superuser_required(
    view_func: Callable[..., HttpResponse],
) -> Callable[..., HttpResponse]:
    @wraps(view_func)
    def wrapper(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        if not request.user.is_superuser:
            raise PermissionDenied

        return view_func(request, *args, **kwargs)

    return wrapper
