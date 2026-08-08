from dataclasses import dataclass
from typing import Any, Literal, NamedTuple, TypedDict, TypeVar

from django.contrib.auth.models import User
from django.db import models
from django.http import HttpRequest


class TSessionData(TypedDict):
    cookies: dict[str, str]
    headers: dict[str, str]


class TPaginationData(NamedTuple):
    current_page: int  # current page number
    total_pages: int  # total number of pages
    has_previous: bool  # whether there's a previous page
    has_next: bool  # whether there's a next page
    previous_page_number: int  # previous page number (or None)
    next_page_number: int  # next page number (or None)


T = TypeVar("T")
E = TypeVar("E")


@dataclass
class TSuccess[T]:
    value: T
    ok: Literal[True] = True


@dataclass
class TFailure[E]:
    err: E
    ok: Literal[False] = False


TResult = TSuccess[E] | TFailure[T]


class CommonModel(models.Model):
    datetime_created = models.DateTimeField(auto_now_add=True, editable=False)
    datetime_modified = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        abstract = True

    def save(self, *args: Any, **kwargs: Any) -> None:
        # include datetime_modified if not provided
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            update_fields = list(update_fields)
            if "datetime_modified" not in update_fields:
                update_fields.append("datetime_modified")
                kwargs["update_fields"] = update_fields

        super().save(*args, **kwargs)


class AuthenticatedRequest(HttpRequest):
    user: User


__all__ = ["TResult"]
