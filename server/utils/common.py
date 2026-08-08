from collections.abc import Callable
from typing import Any

import cattrs
import requests
from django.core.paginator import Page, Paginator
from django.db import IntegrityError, models, transaction
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from requests import Session
from requests.adapters import HTTPAdapter, Retry
from requests.utils import cookiejar_from_dict, dict_from_cookiejar
from rest_framework.exceptions import ValidationError

from .typedefs import TFailure, TPaginationData, TResult, TSessionData, TSuccess

TIsNewRecord = bool


def error_json_response(errors: list[str], *, status: int, **kwargs: Any) -> JsonResponse:
    return JsonResponse(errors, status=status, safe=False, **kwargs)


def unwrap[T](result: TResult[T, Any]) -> T:
    """
    Return a TResult's success value, or raise its error.

    If the held error is already an Exception it's raised as-is; otherwise
    it's wrapped in a plain Exception so callers always get something
    raise-able regardless of what error type the TResult carries.
    """
    if result.ok:
        return result.value

    if isinstance(result.err, BaseException):
        raise result.err
    raise Exception(result.err)  # noqa: TRY002 -- err's type is arbitrary, no specific exception fits


def cast_type[T](data: Any, _interface_class: type[T]) -> T:
    temp: T = data
    return temp


def validate_structure[T](data: Any, interface_class: type[T], is_api: bool = True) -> T:
    c = cattrs.Converter()
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


def validate_only_struct_keys[T](data: Any, interface_class: type[T]) -> T:
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


def validation_hook_generic[T](value: T, expected_type: type[T]) -> T:
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


def bulk_create_and_get[TModel: models.Model](
    model_class: type[TModel],
    items: list[TModel],
    *,
    fields: list[str],
    batch_size: int | None = None,
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
    # django-stubs can't see `.objects` on a plain `type[TModel]` bound to models.Model
    model_class.objects.bulk_create(  # type: ignore[attr-defined]
        items, batch_size=batch_size, ignore_conflicts=True
    )

    filter_criteria = _get_filter_criteria(items, fields)

    return model_class.objects.filter(**filter_criteria)  # type: ignore[attr-defined, no-any-return]


def atomic_get_or_create[TModel: models.Model](
    instance: TModel, *, fields: list[str]
) -> tuple[TModel, TIsNewRecord]:
    """
    Save `instance`, or fetch the existing row if a concurrent insert already created it.

    Unlike Django's built-in `get_or_create`, which does a SELECT before the INSERT (and so
    is vulnerable to a race between two concurrent calls both seeing no existing row and both
    attempting to insert), this always attempts the INSERT first. If it fails with
    `IntegrityError` (e.g. a unique constraint on `fields`), that's treated as proof a
    concurrent request already created the matching row, and that row is fetched instead of
    letting the error propagate.
    """
    model_class: type[TModel] = type(instance)

    try:
        with transaction.atomic():
            instance.save()
            return instance, True
    except IntegrityError:
        filter_criteria = _get_filter_criteria([instance], fields)
        return model_class.objects.get(**filter_criteria), False  # type: ignore[attr-defined]


def _get_filter_criteria[T](items: list[T], unique_fieldnames: list[str]) -> dict[str, Any]:
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


def get_pagination_data[TModelSubclass: models.Model](
    queryset: models.QuerySet[TModelSubclass], *, page: int, page_size: int
) -> TResult[tuple[Page[TModelSubclass], TPaginationData], ValueError]:
    """
    Paginate queryset and return the requested page alongside its TPaginationData.

    `Paginator.get_page` silently clamps an out-of-range or non-integer `page` to the
    nearest valid page instead of raising - so `page` is checked against the resolved
    page's actual number and reported as a TFailure on mismatch, rather than letting the
    caller believe it got the page it asked for when it didn't.
    """
    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page)

    if page_obj.number != page:
        return TFailure(
            ValueError(f"Page {page} does not exist — there are {paginator.num_pages} page(s)")
        )

    return TSuccess(
        (
            page_obj,
            TPaginationData(
                current_page=page_obj.number,
                total_pages=paginator.num_pages,
                has_previous=page_obj.has_previous(),
                has_next=page_obj.has_next(),
                previous_page_number=page_obj.previous_page_number()
                if page_obj.has_previous()
                else 0,
                next_page_number=page_obj.next_page_number() if page_obj.has_next() else 0,
            ),
        )
    )


def conditional_redirect(
    view_func: Callable[..., HttpResponse],
    target_name: str,
    should_redirect: Callable[[HttpRequest], bool],
) -> Callable[[HttpRequest, Any, Any], HttpResponse]:
    def _wrapped_view(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        if should_redirect(request):
            return redirect(reverse(target_name))
        return view_func(request, *args, **kwargs)

    return _wrapped_view
