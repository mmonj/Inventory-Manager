from typing import Any, Optional, Type, TypeVar  # noqa: UP035

import cattrs
import requests
from django.db import IntegrityError, models, transaction
from requests import Session
from requests.adapters import HTTPAdapter, Retry
from requests.utils import cookiejar_from_dict, dict_from_cookiejar
from rest_framework.exceptions import ValidationError

from .typedefs import TSessionData

T = TypeVar("T")

TModel = TypeVar("TModel", bound=models.Model)
TIsNewRecord = bool


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


def get_http_retrier(num_retries: int = 3, backoff_factor: float = 0.1) -> Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
        }
    )

    retry_strategy = Retry(
        total=num_retries, backoff_factor=backoff_factor, status_forcelist=[500, 502, 503, 504]
    )

    session.mount("http://", HTTPAdapter(max_retries=retry_strategy))
    session.mount("https://", HTTPAdapter(max_retries=retry_strategy))

    return session


def session_object_to_session_dict(session: Session) -> TSessionData:
    return {
        "headers": dict(session.headers),  # type: ignore [arg-type]
        "cookies": dict_from_cookiejar(session.cookies),  # type: ignore [no-untyped-call]
    }


def session_dict_to_session_object(data: TSessionData) -> Session:
    session = Session()
    session.headers.update(data.get("headers", {}))
    session.cookies = cookiejar_from_dict(data.get("cookies", {}))  # type: ignore [no-untyped-call]
    return session


def bulk_create_and_get(
    model_class: Type[TModel],
    items: list[TModel],
    *,
    fields: list[str],
    batch_size: Optional[int] = None,
) -> models.QuerySet[TModel]:
    """
    Bulk creates items in the database with ignore_conflicts=True and
    returns the full queryset of records with their primary keys populated.

    Args:
        model_class (Type[models.Model]): The Django model class.
        items (List[models.Model]): A list of model instances to be created.
        batch_size (int|None): Limit committed records to a specified batch size.
        fields (List[str]): The field names based on which to re-query after bulk_create and return them.

    Returns:
        QuerySet[models.Model]: The successfully inserted records with primary keys.
    """
    model_class.objects.bulk_create(items, batch_size=batch_size, ignore_conflicts=True)

    filter_criteria = _get_filter_criteria(items, fields)

    return model_class.objects.filter(**filter_criteria)


def atomic_get_or_create(instance: TModel, *, fields: list[str]) -> tuple[TModel, TIsNewRecord]:
    model_class: Type[TModel] = type(instance)

    try:
        with transaction.atomic():
            instance.save()
            return instance, True
    except IntegrityError:
        filter_criteria = _get_filter_criteria([instance], fields)
        return model_class.objects.get(**filter_criteria), False


def _get_filter_criteria(items: list[T], unique_fieldnames: list[str]) -> dict[str, Any]:
    filter_criteria = {}
    for field in unique_fieldnames:
        if "__" in field:
            *related_fields, final_field = field.split("__")
            filter_values = set()
            for item in items:
                related_obj = item
                for attr in related_fields:
                    related_obj = getattr(related_obj, attr, None)  # type: ignore [assignment]
                    if related_obj is None:
                        break
                if related_obj is not None:
                    filter_values.add(getattr(related_obj, final_field, None))
        else:
            filter_values = {getattr(item, field) for item in items}

        filter_criteria[f"{field}__in"] = filter_values
    return filter_criteria
