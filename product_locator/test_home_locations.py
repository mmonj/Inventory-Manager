from datetime import timedelta
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from .models import HomeLocation, Planogram, Product, Store

pytestmark = pytest.mark.django_db

UPC_1 = "012345678905"


@pytest.fixture
def store() -> Store:
    return Store.objects.create(name="T1000")


@pytest.fixture
def planogram(store: Store) -> Planogram:
    return Planogram.objects.create(name="Inline", store=store)


@pytest.fixture
def logged_in_client() -> Client:
    user = get_user_model().objects.create_user(username="location_tester")
    client = Client()
    client.force_login(user)
    return client


def post_add_location(client: Client, **overrides: Any) -> Any:
    request_body = {"upc": UPC_1, "product_name": "Card", "location": "A15", **overrides}
    return client.post(
        reverse("product_locator:add_new_product_location"),
        data=request_body,
        content_type="application/json",
    )


def assert_refused(response: Any, status_code: int = 400) -> None:
    assert response.status_code == status_code
    error_messages = response.json()
    assert isinstance(error_messages, list)
    assert error_messages
    assert all(isinstance(message, str) for message in error_messages)
    assert not Product.objects.exists()
    assert not HomeLocation.objects.exists()


@pytest.mark.parametrize("location", ["NOT A LOCATION", "A1234", "AB1", "", "   "])
def test_add_location_refuses_a_name_outside_the_grammar(
    logged_in_client: Client, planogram: Planogram, store: Store, location: str
) -> None:
    response = post_add_location(
        logged_in_client, location=location, planogram_id=planogram.pk, store_id=store.pk
    )

    assert_refused(response)


def test_add_location_refuses_an_outdated_planogram(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    planogram.date_end = timezone.localdate() - timedelta(days=1)
    planogram.save()

    response = post_add_location(logged_in_client, planogram_id=planogram.pk, store_id=store.pk)

    assert_refused(response)


def test_add_location_refuses_a_planogram_from_another_store(
    logged_in_client: Client, planogram: Planogram
) -> None:
    other_store = Store.objects.create(name="T2000")

    response = post_add_location(
        logged_in_client, planogram_id=planogram.pk, store_id=other_store.pk
    )

    assert_refused(response)


def test_add_location_returns_404_for_a_missing_planogram(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    missing_planogram_id = planogram.pk + 1

    response = post_add_location(
        logged_in_client, planogram_id=missing_planogram_id, store_id=store.pk
    )

    assert_refused(response, status_code=404)


@pytest.mark.parametrize("planogram_id", ["not-a-number", "", None])
def test_add_location_refuses_a_non_numeric_planogram_id(
    logged_in_client: Client, store: Store, planogram_id: str | None
) -> None:
    response = post_add_location(logged_in_client, planogram_id=planogram_id, store_id=store.pk)

    assert_refused(response)


def test_add_location_refuses_an_existing_name_outside_the_grammar(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    existing_location = HomeLocation.objects.create(name="OUTDATED99", planogram=planogram)

    response = post_add_location(
        logged_in_client, location="outdated99", planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 400
    assert not Product.objects.exists()
    assert not existing_location.products.exists()


@pytest.mark.parametrize(
    "request_fields",
    [{"upc": "012345678900"}, {"upc": "123"}, {"product_name": "x" * 101}],
    ids=["bad_check_digit", "too_short", "name_too_long"],
)
def test_add_location_refuses_an_invalid_new_product(
    logged_in_client: Client, planogram: Planogram, store: Store, request_fields: dict[str, str]
) -> None:
    response = post_add_location(
        logged_in_client, planogram_id=planogram.pk, store_id=store.pk, **request_fields
    )

    assert_refused(response)


@pytest.mark.parametrize(
    ("location", "stored_name"),
    [("a15", "A15"), (" A15 ", "A15"), ("A1", "A1"), ("b123", "B123")],
)
def test_add_location_stores_the_normalized_name(
    logged_in_client: Client, planogram: Planogram, store: Store, location: str, stored_name: str
) -> None:
    response = post_add_location(
        logged_in_client, location=location, planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200
    home_location = planogram.locations.get()
    assert home_location.name == stored_name
    assert [product.upc for product in home_location.products.all()] == [UPC_1]


def test_add_location_accepts_a_planogram_ending_today(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    planogram.date_end = timezone.localdate()
    planogram.save()

    response = post_add_location(logged_in_client, planogram_id=planogram.pk, store_id=store.pk)

    assert response.status_code == 200


def test_add_location_names_a_new_product(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    response = post_add_location(
        logged_in_client, product_name="New Card", planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200
    assert Product.objects.get(upc=UPC_1).name == "New Card"


def test_add_location_ignores_the_name_for_an_existing_product(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    Product.objects.create(upc=UPC_1, name="Original Card")

    response = post_add_location(
        logged_in_client, product_name="Renamed Card", planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200
    product = Product.objects.get(upc=UPC_1)
    assert product.name == "Original Card"
    assert [location.name for location in product.home_locations.all()] == ["A15"]


def test_add_location_twice_keeps_one_home_location(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    for location in ["A15", "a15"]:
        response = post_add_location(
            logged_in_client, location=location, planogram_id=planogram.pk, store_id=store.pk
        )
        assert response.status_code == 200

    assert Product.objects.get(upc=UPC_1).home_locations.count() == 1


def test_add_location_requires_a_login(planogram: Planogram, store: Store) -> None:
    response = post_add_location(Client(), planogram_id=planogram.pk, store_id=store.pk)

    assert response.status_code in {401, 403}
    assert not Product.objects.exists()
