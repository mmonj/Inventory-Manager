from typing import Any, Type, TypeVar

import cattrs
from rest_framework.exceptions import ValidationError

T = TypeVar("T")


def validate_structure(data: Any, interfaceClass: Type[T], is_api: bool = True) -> T:
    try:
        obj = cattrs.structure(data, interfaceClass)
    # if missing attribute
    except cattrs.ClassValidationError as exc:
        if is_api:
            raise ValidationError(cattrs.transform_error(exc))
        else:
            raise Exception(cattrs.transform_error(exc))
    # if attribute is of wrong type
    except ValueError as exc:
        if is_api:
            raise ValidationError(cattrs.transform_error(exc))
        else:
            raise Exception(cattrs.transform_error(exc))

    return obj


def validate_structure_rough(data: Any, interfaceClass: Type[T]) -> T:
    missing_keys: list[str] = []
    extra_keys: list[str] = []

    for key in interfaceClass.__annotations__:
        if key not in data:
            missing_keys.append(key)

    if len(missing_keys) != 0:
        raise Exception(
            f"Type class '{interfaceClass}' expected the "
            f"following missing keys: {', '.join(missing_keys)}"
        )

    for key in data:
        if key not in interfaceClass.__annotations__:
            extra_keys.append(key)

    if len(extra_keys) != 0:
        print(
            f"Validation for Type class '{interfaceClass}' found "
            f"extra keys: {', '.join(extra_keys)}"
        )

    return data  # type: ignore [no-any-return]


def validation_hook_generic(value: T, expected_type: Type[T]) -> T:
    if not isinstance(value, expected_type):
        raise ValueError(
            f"Value of {repr(value)} has type {type(value)}. Expected {expected_type}."
        )
    return value
