from dataclasses import dataclass
from typing import Generic, Literal, TypeVar, Union

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


__all__ = ["TResult"]
