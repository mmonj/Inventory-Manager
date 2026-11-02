from datetime import timedelta
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from .models import HomeLocation, Planogram, Product, ProductScanAudit, Store

pytestmark = pytest.mark.django_db

UPC_1 = "012345678905"
OLDER_UPC = "036000291452"


@pytest.fixture
def store() -> Store:
    return Store.objects.create(name="T1000")


@pytest.fixture
def planogram(store: Store) -> Planogram:
    return Planogram.objects.create(name="Inline", store=store)


@pytest.fixture
def scan_audit() -> ProductScanAudit:
    return ProductScanAudit.objects.create(product_type="Cards")


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


def post_scan(client: Client, scan_audit: ProductScanAudit, upc: str) -> Any:
    return client.post(
        reverse("product_locator:add_upc_to_scan_audit"),
        data={"scan_audit_id": scan_audit.pk, "upc": upc},
        content_type="application/json",
    )


def post_carryover(
    client: Client, older_product: Product, planograms: list[Planogram], store: Store
) -> Any:
    return client.post(
        reverse("product_locator:carry_over_home_locations"),
        data={
            "upc": UPC_1,
            "older_product_id": older_product.pk,
            "planogram_ids": [planogram.pk for planogram in planograms],
            "store_id": store.pk,
        },
        content_type="application/json",
        headers={"accept": "application/json"},
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


@pytest.mark.parametrize("upc", ["012345678900", "123"], ids=["bad_check_digit", "too_short"])
def test_scan_audit_refuses_an_invalid_upc(
    logged_in_client: Client, scan_audit: ProductScanAudit, upc: str
) -> None:
    response = post_scan(logged_in_client, scan_audit, upc)

    assert_refused(response)
    assert not scan_audit.products_in_stock.exists()


def test_scan_audit_adds_a_new_upc_with_a_blank_name(
    logged_in_client: Client, scan_audit: ProductScanAudit
) -> None:
    response = post_scan(logged_in_client, scan_audit, UPC_1)

    assert response.status_code == 200
    product = Product.objects.get(upc=UPC_1)
    assert product.name == ""
    assert list(scan_audit.products_in_stock.all()) == [product]


def test_scan_audit_keeps_the_name_of_an_existing_upc(
    logged_in_client: Client, scan_audit: ProductScanAudit
) -> None:
    product = Product.objects.create(upc=UPC_1, name="Original Card")

    response = post_scan(logged_in_client, scan_audit, UPC_1)

    assert response.status_code == 200
    product.refresh_from_db()
    assert product.name == "Original Card"
    assert list(scan_audit.products_in_stock.all()) == [product]


def test_carryover_creates_the_product_with_the_older_name_and_returns_it(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    older_product.home_locations.add(HomeLocation.objects.create(name="A1", planogram=planogram))

    response = post_carryover(logged_in_client, older_product, [planogram], store)

    assert response.status_code == 200
    assert response.json()["product"]["upc"] == UPC_1
    assert response.json()["product"]["name"] == "Older Card"
    product = Product.objects.get(upc=UPC_1)
    assert product.name == "Older Card"
    assert [location.name for location in product.home_locations.all()] == ["A1"]


def test_carryover_links_every_older_location_in_a_chosen_planogram_only(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    unchosen_planogram = Planogram.objects.create(name="Seasonal", store=store)
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    older_product.home_locations.add(
        HomeLocation.objects.create(name="A1", planogram=planogram),
        HomeLocation.objects.create(name="B2", planogram=planogram),
        HomeLocation.objects.create(name="C3", planogram=unchosen_planogram),
    )

    response = post_carryover(logged_in_client, older_product, [planogram], store)

    assert response.status_code == 200
    product = Product.objects.get(upc=UPC_1)
    assert sorted(location.name for location in product.home_locations.all()) == ["A1", "B2"]


def test_carryover_leaves_the_older_product_its_home_locations(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    older_product.home_locations.add(HomeLocation.objects.create(name="A1", planogram=planogram))

    response = post_carryover(logged_in_client, older_product, [planogram], store)

    assert response.status_code == 200
    assert [location.name for location in older_product.home_locations.all()] == ["A1"]
    assert HomeLocation.objects.count() == 1


def test_carryover_links_an_existing_name_outside_the_grammar(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    older_product.home_locations.add(
        HomeLocation.objects.create(name="OUTDATED99", planogram=planogram)
    )

    response = post_carryover(logged_in_client, older_product, [planogram], store)

    assert response.status_code == 200
    product = Product.objects.get(upc=UPC_1)
    assert [location.name for location in product.home_locations.all()] == ["OUTDATED99"]


def test_carryover_never_links_a_planogram_from_another_store(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    other_store = Store.objects.create(name="T2000")
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    older_product.home_locations.add(HomeLocation.objects.create(name="A1", planogram=planogram))

    post_carryover(logged_in_client, older_product, [planogram], other_store)

    assert not HomeLocation.objects.filter(products__upc=UPC_1).exists()


def test_carryover_requires_a_login(planogram: Planogram, store: Store) -> None:
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")

    response = post_carryover(Client(), older_product, [planogram], store)

    assert response.status_code in {401, 403}
    assert not Product.objects.filter(upc=UPC_1).exists()


def test_search_by_name_includes_each_product_upc(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    older_product.home_locations.add(HomeLocation.objects.create(name="A1", planogram=planogram))

    response = logged_in_client.get(
        reverse(
            "product_locator:get_product_locations_by_name",
            kwargs={"store_id": store.pk, "product_name": "older"},
        ),
        headers={"accept": "application/json"},
    )

    assert response.status_code == 200
    assert [product["upc"] for product in response.json()["products"]] == [OLDER_UPC]
