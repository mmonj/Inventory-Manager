from datetime import timedelta
from threading import Thread
from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.db import connections
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from .models import HomeLocation, Planogram, Product, ProductScanAudit, Store

pytestmark = pytest.mark.django_db

NEWER_UPC = "012345678905"
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


def post_home_location_assignment(client: Client, **overrides: Any) -> Any:
    request_body = {"upc": NEWER_UPC, "product_name": "Card", "location": "A15", **overrides}
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
    client: Client,
    older_product: Product,
    planograms: list[Planogram],
    store: Store,
    **overrides: Any,
) -> Any:
    request_body = {
        "upc": NEWER_UPC,
        "older_product_id": older_product.pk,
        "planogram_ids": [planogram.pk for planogram in planograms],
        "store_id": store.pk,
        **overrides,
    }
    return client.post(
        reverse("product_locator:carry_over_home_locations"),
        data=request_body,
        content_type="application/json",
        headers={"accept": "application/json"},
    )


def search_by_name(client: Client, store: Store, product_name: str) -> Any:
    return client.get(
        reverse("product_locator:get_product_locations_by_name", kwargs={"store_id": store.pk}),
        data={"product_name": product_name},
        headers={"accept": "application/json"},
    )


def get_error_messages(response: Any, status_code: int) -> list[str]:
    assert response.status_code == status_code
    error_messages = response.json()
    assert isinstance(error_messages, list)
    assert error_messages
    assert all(isinstance(message, str) for message in error_messages)
    return error_messages


def assert_refused(response: Any, status_code: int = 400) -> None:
    get_error_messages(response, status_code)
    assert not Product.objects.exists()
    assert not HomeLocation.objects.exists()


def assert_carryover_refused(
    response: Any, status_code: int = 400, expected_message_text: str = ""
) -> None:
    error_messages = get_error_messages(response, status_code)
    assert any(expected_message_text in message for message in error_messages)
    assert not Product.objects.filter(upc=NEWER_UPC).exists()


@pytest.fixture
def older_product(planogram: Planogram) -> Product:
    product = Product.objects.create(upc=OLDER_UPC, name="Older Card")
    product.home_locations.add(HomeLocation.objects.create(name="A1", planogram=planogram))
    return product


@pytest.mark.parametrize("location", ["NOT A LOCATION", "A1234", "AB1", "", "   "])
def test_assignment_refuses_a_name_outside_the_grammar(
    logged_in_client: Client, planogram: Planogram, store: Store, location: str
) -> None:
    response = post_home_location_assignment(
        logged_in_client, location=location, planogram_id=planogram.pk, store_id=store.pk
    )

    assert_refused(response)


def test_assignment_refuses_an_outdated_planogram(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    planogram.date_end = timezone.localdate() - timedelta(days=1)
    planogram.save()

    response = post_home_location_assignment(
        logged_in_client, planogram_id=planogram.pk, store_id=store.pk
    )

    assert_refused(response)


def test_assignment_refuses_a_planogram_from_another_store(
    logged_in_client: Client, planogram: Planogram
) -> None:
    other_store = Store.objects.create(name="T2000")

    response = post_home_location_assignment(
        logged_in_client, planogram_id=planogram.pk, store_id=other_store.pk
    )

    assert_refused(response)


def test_assignment_returns_404_for_a_missing_planogram(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    missing_planogram_id = planogram.pk + 1

    response = post_home_location_assignment(
        logged_in_client, planogram_id=missing_planogram_id, store_id=store.pk
    )

    assert_refused(response, status_code=404)


@pytest.mark.parametrize("planogram_id", ["not-a-number", "", None])
def test_assignment_refuses_a_non_numeric_planogram_id(
    logged_in_client: Client, store: Store, planogram_id: str | None
) -> None:
    response = post_home_location_assignment(
        logged_in_client, planogram_id=planogram_id, store_id=store.pk
    )

    assert_refused(response)


def test_assignment_refuses_an_existing_name_outside_the_grammar(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    existing_location = HomeLocation.objects.create(name="OUTDATED99", planogram=planogram)

    response = post_home_location_assignment(
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
def test_assignment_refuses_an_invalid_new_product(
    logged_in_client: Client, planogram: Planogram, store: Store, request_fields: dict[str, str]
) -> None:
    response = post_home_location_assignment(
        logged_in_client, planogram_id=planogram.pk, store_id=store.pk, **request_fields
    )

    assert_refused(response)


@pytest.mark.parametrize(
    ("location", "stored_name"),
    [("a15", "A15"), (" A15 ", "A15"), ("A1", "A1"), ("b123", "B123")],
)
def test_assignment_stores_the_normalized_name(
    logged_in_client: Client, planogram: Planogram, store: Store, location: str, stored_name: str
) -> None:
    response = post_home_location_assignment(
        logged_in_client, location=location, planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200
    home_location = planogram.locations.get()
    assert home_location.name == stored_name
    assert [product.upc for product in home_location.products.all()] == [NEWER_UPC]


def test_assignment_accepts_a_planogram_ending_today(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    planogram.date_end = timezone.localdate()
    planogram.save()

    response = post_home_location_assignment(
        logged_in_client, planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200


def test_assignment_names_a_new_product(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    response = post_home_location_assignment(
        logged_in_client, product_name="New Card", planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200
    assert Product.objects.get(upc=NEWER_UPC).name == "New Card"


def test_assignment_ignores_the_name_for_an_existing_product(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    Product.objects.create(upc=NEWER_UPC, name="Original Card")

    response = post_home_location_assignment(
        logged_in_client, product_name="Renamed Card", planogram_id=planogram.pk, store_id=store.pk
    )

    assert response.status_code == 200
    product = Product.objects.get(upc=NEWER_UPC)
    assert product.name == "Original Card"
    assert [location.name for location in product.home_locations.all()] == ["A15"]


def test_assignment_twice_keeps_one_home_location(
    logged_in_client: Client, planogram: Planogram, store: Store
) -> None:
    for location in ["A15", "a15"]:
        response = post_home_location_assignment(
            logged_in_client, location=location, planogram_id=planogram.pk, store_id=store.pk
        )
        assert response.status_code == 200

    assert Product.objects.get(upc=NEWER_UPC).home_locations.count() == 1


def test_assignment_requires_a_login(planogram: Planogram, store: Store) -> None:
    response = post_home_location_assignment(Client(), planogram_id=planogram.pk, store_id=store.pk)

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
    response = post_scan(logged_in_client, scan_audit, NEWER_UPC)

    assert response.status_code == 200
    product = Product.objects.get(upc=NEWER_UPC)
    assert product.name == ""
    assert list(scan_audit.products_in_stock.all()) == [product]


def test_scan_audit_keeps_the_name_of_an_existing_upc(
    logged_in_client: Client, scan_audit: ProductScanAudit
) -> None:
    product = Product.objects.create(upc=NEWER_UPC, name="Original Card")

    response = post_scan(logged_in_client, scan_audit, NEWER_UPC)

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
    assert response.json()["product"]["upc"] == NEWER_UPC
    assert response.json()["product"]["name"] == "Older Card"
    product = Product.objects.get(upc=NEWER_UPC)
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
    product = Product.objects.get(upc=NEWER_UPC)
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
    product = Product.objects.get(upc=NEWER_UPC)
    assert [location.name for location in product.home_locations.all()] == ["OUTDATED99"]


def test_carryover_refuses_a_planogram_from_another_store(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    other_store = Store.objects.create(name="T2000")
    other_store_planogram = Planogram.objects.create(name="Other Inline", store=other_store)
    older_product.home_locations.add(
        HomeLocation.objects.create(name="B2", planogram=other_store_planogram)
    )

    response = post_carryover(
        logged_in_client, older_product, [planogram, other_store_planogram], store
    )

    assert_carryover_refused(response, expected_message_text="Other Inline")


def test_carryover_refuses_an_outdated_planogram(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    outdated_planogram = Planogram.objects.create(
        name="Last Season", store=store, date_end=timezone.localdate() - timedelta(days=1)
    )
    older_product.home_locations.add(
        HomeLocation.objects.create(name="B2", planogram=outdated_planogram)
    )

    response = post_carryover(
        logged_in_client, older_product, [planogram, outdated_planogram], store
    )

    assert_carryover_refused(response, expected_message_text="Last Season")


def test_carryover_refuses_a_planogram_that_no_longer_holds_the_older_product(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    emptied_planogram = Planogram.objects.create(name="Emptied", store=store)

    response = post_carryover(
        logged_in_client, older_product, [planogram, emptied_planogram], store
    )

    assert_carryover_refused(response, expected_message_text="Emptied")


def test_carryover_refuses_a_missing_planogram(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    missing_planogram_id = planogram.pk + 1000

    response = post_carryover(
        logged_in_client,
        older_product,
        [],
        store,
        planogram_ids=[planogram.pk, missing_planogram_id],
    )

    assert_carryover_refused(response, expected_message_text=str(missing_planogram_id))


def test_carryover_refusal_links_nothing_to_an_existing_product(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    existing_product = Product.objects.create(upc=NEWER_UPC, name="Original Card")
    emptied_planogram = Planogram.objects.create(name="Emptied", store=store)

    response = post_carryover(
        logged_in_client, older_product, [planogram, emptied_planogram], store
    )

    assert response.status_code == 400
    assert not existing_product.home_locations.exists()


def test_carryover_refuses_an_empty_planogram_list(
    logged_in_client: Client, older_product: Product, store: Store
) -> None:
    response = post_carryover(logged_in_client, older_product, [], store)

    assert_carryover_refused(response)


def test_carryover_returns_404_for_a_missing_older_product(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    missing_product_id = older_product.pk + 1000

    response = post_carryover(
        logged_in_client,
        older_product,
        [planogram],
        store,
        older_product_id=missing_product_id,
    )

    assert_carryover_refused(
        response, status_code=404, expected_message_text=str(missing_product_id)
    )


@pytest.mark.parametrize("upc", ["012345678900", "123"], ids=["bad_check_digit", "too_short"])
def test_carryover_refuses_an_invalid_new_upc(
    logged_in_client: Client,
    older_product: Product,
    planogram: Planogram,
    store: Store,
    upc: str,
) -> None:
    response = post_carryover(logged_in_client, older_product, [planogram], store, upc=upc)

    assert_carryover_refused(response)
    assert not Product.objects.filter(upc=upc).exists()


def test_carryover_keeps_the_name_of_an_existing_upc(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    Product.objects.create(upc=NEWER_UPC, name="Original Card")

    response = post_carryover(logged_in_client, older_product, [planogram], store)

    assert response.status_code == 200
    assert response.json()["product"]["name"] == "Original Card"
    product = Product.objects.get(upc=NEWER_UPC)
    assert product.name == "Original Card"
    assert [location.name for location in product.home_locations.all()] == ["A1"]


def test_carryover_double_submit_leaves_one_product_without_duplicate_links(
    logged_in_client: Client, older_product: Product, planogram: Planogram, store: Store
) -> None:
    for _submit_number in range(2):
        response = post_carryover(logged_in_client, older_product, [planogram], store)
        assert response.status_code == 200

    product = Product.objects.get(upc=NEWER_UPC)
    assert product.home_locations.count() == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize(
    "is_rival_first_in_validation",
    [True, False],
    ids=["rival_seen_by_validation", "rival_commits_after_validation"],
)
def test_carryover_succeeds_when_another_request_creates_the_upc_first(
    logged_in_client: Client,
    older_product: Product,
    planogram: Planogram,
    store: Store,
    monkeypatch: pytest.MonkeyPatch,
    is_rival_first_in_validation: bool,
) -> None:
    original_full_clean = Product.full_clean

    def commit_rival_product_on_its_own_connection(upc: str) -> None:
        def create_rival_product() -> None:
            # bulk_create skips Product.save, so it doesn't re-enter the patched full_clean
            Product.objects.bulk_create([Product(upc=upc, name="Rival Card")])
            connections.close_all()

        rival_thread = Thread(target=create_rival_product)
        rival_thread.start()
        rival_thread.join()

    def full_clean_during_a_race(self: Product, *args: Any, **kwargs: Any) -> None:
        if is_rival_first_in_validation:
            commit_rival_product_on_its_own_connection(self.upc)
        original_full_clean(self, *args, **kwargs)
        if not is_rival_first_in_validation:
            commit_rival_product_on_its_own_connection(self.upc)

    monkeypatch.setattr(Product, "full_clean", full_clean_during_a_race)

    response = post_carryover(logged_in_client, older_product, [planogram], store)

    assert response.status_code == 200
    product = Product.objects.get(upc=NEWER_UPC)
    assert product.name == "Rival Card"
    assert [location.name for location in product.home_locations.all()] == ["A1"]


def test_carryover_requires_a_login(planogram: Planogram, store: Store) -> None:
    older_product = Product.objects.create(upc=OLDER_UPC, name="Older Card")

    response = post_carryover(Client(), older_product, [planogram], store)

    assert response.status_code in {401, 403}
    assert not Product.objects.filter(upc=NEWER_UPC).exists()


def test_search_by_name_includes_each_product_upc(
    logged_in_client: Client, older_product: Product, store: Store
) -> None:
    response = search_by_name(logged_in_client, store, "older")

    assert response.status_code == 200
    assert [product["upc"] for product in response.json()["products"]] == [OLDER_UPC]


@pytest.mark.parametrize(
    "product_name", ["Mom/Dad", "Why? Not", "Card #1", "100% Fun", "..", "a&b=c", "Dad\\Son"]
)
def test_search_by_name_finds_names_with_url_special_characters(
    logged_in_client: Client, planogram: Planogram, store: Store, product_name: str
) -> None:
    matching_product = Product.objects.create(upc=OLDER_UPC, name=f"Birthday {product_name} Card")
    matching_product.home_locations.add(HomeLocation.objects.create(name="A1", planogram=planogram))

    response = search_by_name(logged_in_client, store, product_name)

    assert response.status_code == 200
    assert [product["upc"] for product in response.json()["products"]] == [OLDER_UPC]


def test_search_by_name_with_no_matches_returns_an_empty_list(
    logged_in_client: Client, older_product: Product, store: Store
) -> None:
    response = search_by_name(logged_in_client, store, "nothing like this")

    assert response.status_code == 200
    assert response.json()["products"] == []


@pytest.mark.parametrize("product_name", ["", "   "])
def test_search_by_name_refuses_blank_text(
    logged_in_client: Client, older_product: Product, store: Store, product_name: str
) -> None:
    response = search_by_name(logged_in_client, store, product_name)

    assert response.status_code == 400
    assert isinstance(response.json(), list)


@pytest.mark.parametrize(
    ("upc", "status_code"),
    [(NEWER_UPC, 404), ("012345678900", 400)],
    ids=["unknown_upc", "invalid_upc"],
)
def test_lookup_only_reports_404_for_a_valid_upc_with_no_product(
    logged_in_client: Client, store: Store, upc: str, status_code: int
) -> None:
    response = logged_in_client.get(
        reverse("product_locator:get_product_location"),
        data={"upc": upc, "store_id": str(store.pk)},
        headers={"accept": "application/json"},
    )

    assert response.status_code == status_code
