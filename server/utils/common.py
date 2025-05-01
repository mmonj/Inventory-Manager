from typing import Any, Type, TypeVar  # noqa: UP035

import cattrs
from rest_framework.exceptions import ValidationError

T = TypeVar("T")


def cast_type(data: Any, _interface_class: Type[T]) -> T:
    temp: T = data
    return temp


def validate_structure(data: Any, interface_class: Type[T], is_api: bool = True) -> T:
    c = cattrs.Converter(forbid_extra_keys=True)
    try:
        obj = c.structure(data, interface_class)
    # if missing attribute
    except cattrs.ClassValidationError as exc:
        if is_api:
            raise ValidationError(cattrs.transform_error(exc)) from exc
        raise TypeError(cattrs.transform_error(exc)) from exc
    # if attribute is of wrong type
    except ValueError as exc:
        if is_api:
            raise ValidationError(cattrs.transform_error(exc)) from exc
        raise ValueError(cattrs.transform_error(exc)) from exc

    return obj


def validate_only_struct_keys(data: Any, interface_class: Type[T]) -> T:
    missing_keys: list[str] = []
    extra_keys: list[str] = []

    missing_keys += [key for key in interface_class.__annotations__ if key not in data]

    if len(missing_keys) != 0:
        raise KeyError(
            f"Type class '{interface_class}' expected the "
            f"following missing keys: {', '.join(missing_keys)}"
        )

    extra_keys += [key for key in data if key not in interface_class.__annotations__]

    if len(extra_keys) != 0:
        print(
            f"Validation for Type class '{interface_class}' found "
            f"extra keys: {', '.join(extra_keys)}"
        )

    return data  # type: ignore [no-any-return]


def validation_hook_generic(value: T, expected_type: Type[T]) -> T:
    if not isinstance(value, expected_type):
        raise TypeError(f"Value of {value!r} has type {type(value)}. Expected {expected_type}.")
    return value


def get_degree_offset_from_meters(meters: float) -> float:
    meters_per_degree = 111_320.0
    return meters / meters_per_degree
