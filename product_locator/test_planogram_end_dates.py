from datetime import date, timedelta
from typing import Any, cast

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from .models import HomeLocation, Planogram, Product, Store

pytestmark = pytest.mark.django_db

UPC_1 = "012345678905"
START_DATE = date(2026, 1, 10)


@pytest.fixture
def superuser_client() -> Client:
    user = get_user_model().objects.create_superuser(username="end_date_tester")
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def planogram() -> Planogram:
    store = Store.objects.create(name="T1000")
    return Planogram.objects.create(name="Inline", store=store, date_start=START_DATE)


def days_from_today(days: int) -> date:
    return timezone.localdate() + timedelta(days=days)


def post_end_date(client: Client, planogram: Planogram, date_end: str | None) -> Any:
    return client.post(
        reverse("product_locator:edit_planogram"),
        {
            "planogram_id": planogram.pk,
            "name": planogram.name,
            "plano_type": planogram.plano_type,
            "date_end": date_end,
            "planogram_text_dump": "",
            "is_reset_planogram": False,
            "label": "",
        },
        content_type="application/json",
        headers={"Accept": "application/json"},
    )


@pytest.mark.parametrize(
    ("days_until_end", "is_outdated"),
    [(None, False), (30, False), (0, False), (-1, True)],
)
def test_planogram_is_outdated_only_after_its_end_date(
    planogram: Planogram, days_until_end: int | None, is_outdated: bool
) -> None:
    planogram.date_end = None if days_until_end is None else days_from_today(days_until_end)
    planogram.save()

    assert planogram.is_outdated is is_outdated
    assert (planogram.plano_status == " [OUTDATED]") is is_outdated
    assert Planogram.get_current_planograms().filter(pk=planogram.pk).exists() is not is_outdated


def test_editing_sets_an_end_date(superuser_client: Client, planogram: Planogram) -> None:
    response = post_end_date(superuser_client, planogram, "2027-01-15")

    assert response.status_code == 200
    planogram.refresh_from_db()
    assert planogram.date_end == date(2027, 1, 15)


def test_editing_clears_an_end_date(superuser_client: Client, planogram: Planogram) -> None:
    planogram.date_end = date(2027, 1, 15)
    planogram.save()

    response = post_end_date(superuser_client, planogram, None)

    assert response.status_code == 200
    planogram.refresh_from_db()
    assert planogram.date_end is None


def test_editing_treats_a_blank_end_date_as_none(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_end_date(superuser_client, planogram, "")

    assert response.status_code == 200
    planogram.refresh_from_db()
    assert planogram.date_end is None


def test_validation_reports_an_unparsed_start_date_as_a_field_error(planogram: Planogram) -> None:
    planogram.date_start = cast("Any", "not-a-date")
    planogram.date_end = date(2027, 1, 15)

    with pytest.raises(ValidationError) as error_info:
        planogram.full_clean()

    assert "date_start" in error_info.value.message_dict


def test_editing_allows_an_end_date_on_the_start_date(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_end_date(superuser_client, planogram, "2026-01-10")

    assert response.status_code == 200


def test_editing_refuses_an_end_date_before_the_start_date(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_end_date(superuser_client, planogram, "2026-01-09")

    assert response.status_code == 400
    assert response.json() == ["End date can't be before the start date."]
    planogram.refresh_from_db()
    assert planogram.date_end is None


def test_editing_refuses_an_invalid_end_date(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_end_date(superuser_client, planogram, "not-a-date")

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.date_end is None


def test_store_planograms_include_outdated_ones_and_say_which(
    superuser_client: Client, planogram: Planogram
) -> None:
    Planogram.objects.create(
        name="Old", store=planogram.store, date_start=START_DATE, date_end=days_from_today(-1)
    )

    response = superuser_client.get(
        reverse("product_locator:get_planograms_by_store", args=[planogram.store_id]),
        headers={"Accept": "application/json"},
    )

    planogram_statuses = {
        entry["planogram"]["name"]: entry["planogram"]["is_outdated"]
        for entry in response.json()["planograms"]
    }
    assert planogram_statuses == {"Inline": False, "Old": True}


@pytest.mark.parametrize(("days_until_end", "is_found"), [(30, True), (0, True), (-1, False)])
def test_product_search_follows_the_end_date(
    superuser_client: Client, planogram: Planogram, days_until_end: int, is_found: bool
) -> None:
    planogram.date_end = days_from_today(days_until_end)
    planogram.save()
    home_location = HomeLocation.objects.create(name="A1", planogram=planogram)
    Product.objects.create(upc=UPC_1, name="Birthday Card").home_locations.add(home_location)

    response = superuser_client.get(
        reverse("product_locator:get_product_locations_by_name", args=[planogram.store_id]),
        data={"product_name": "Birthday"},
        headers={"Accept": "application/json"},
    )

    assert response.status_code == 200
    assert (len(response.json()["products"]) == 1) is is_found
