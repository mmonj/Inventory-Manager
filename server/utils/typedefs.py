from dataclasses import dataclass
from typing import Generic, Literal, TypeVar, Union

from django.contrib.auth.models import User
from django.db import models
from django.http import HttpRequest

T = TypeVar("T")
E = TypeVar("E")


@dataclass
class TSuccess(Generic[T]):
    value: T
    ok: Literal[True] = True


@dataclass
class TFailure(Generic[E]):
    err: E
    ok: Literal[False] = False


TResult = Union[TSuccess[E], TFailure[T]]


class CommonModel(models.Model):
    datetime_created = models.DateTimeField(auto_now_add=True, editable=False)
    datetime_modified = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        abstract = True


class StaffRequest(HttpRequest):
    user: User


__all__ = ["TResult"]
