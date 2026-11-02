from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

from .models import HomeLocation, Planogram, PlanogramUpdate, Product, Store
from .planogram_parser import parse_data
from .planogram_updates import apply_planogram_update, get_old_plano, queue_planogram_update
from .types import IImportedProductInfo

pytestmark = pytest.mark.django_db

UPC_1 = "012345678905"
UPC_2 = "843740198695"
UPC_3 = "843740135607"
INVALID_UPC = "012345678906"


@pytest.fixture
def planogram() -> Planogram:
    store = Store.objects.create(name="T1000")
    return Planogram.objects.create(name="Inline", store=store)


def imported_product(location: str, upc: str, name: str = "Card") -> IImportedProductInfo:
    return {"location": location, "upc": upc, "name": name}


def place_product(planogram: Planogram, location: str, upc: str, name: str = "Card") -> None:
    home_location, _ = HomeLocation.objects.get_or_create(name=location, planogram=planogram)
    product, _ = Product.objects.get_or_create(upc=upc, defaults={"name": name})
    product.home_locations.add(home_location)


def queue_update(planogram: Planogram, *products: IImportedProductInfo) -> PlanogramUpdate:
    result = queue_planogram_update("Fall reset", list(products), planogram)
    assert result.ok
    return result.value


def layout_of(planogram: Planogram) -> dict[str, list[str]]:
    return {
        location.name: sorted(product.upc for product in location.products.all())
        for location in planogram.locations.prefetch_related("products")
    }


def test_queueing_supersedes_the_pending_update(planogram: Planogram) -> None:
    first_update = queue_update(planogram, imported_product("A1", UPC_1))
    second_update = queue_update(planogram, imported_product("A1", UPC_2))

    first_update.refresh_from_db()
    assert first_update.status == PlanogramUpdate.Status.SUPERSEDED
    assert second_update.status == PlanogramUpdate.Status.PENDING


def test_queueing_leaves_other_planograms_pending_update_alone(planogram: Planogram) -> None:
    other_planogram = Planogram.objects.create(name="Seasonal", store=planogram.store)
    other_update = queue_update(other_planogram, imported_product("A1", UPC_1))

    queue_update(planogram, imported_product("A1", UPC_2))

    other_update.refresh_from_db()
    assert other_update.status == PlanogramUpdate.Status.PENDING


def test_queueing_refuses_a_location_used_twice(planogram: Planogram) -> None:
    pending_update = queue_update(planogram, imported_product("A1", UPC_1))

    result = queue_planogram_update(
        "Fall reset", [imported_product("A1", UPC_2), imported_product("A1", UPC_3)], planogram
    )

    assert not result.ok
    assert any("A1" in message for message in result.err)
    pending_update.refresh_from_db()
    assert pending_update.status == PlanogramUpdate.Status.PENDING


def test_queueing_allows_one_upc_at_several_locations(planogram: Planogram) -> None:
    update = queue_update(planogram, imported_product("A1", UPC_1), imported_product("A2", UPC_1))

    assert apply_planogram_update(update).ok
    assert layout_of(planogram) == {"A1": [UPC_1], "A2": [UPC_1]}


def test_queueing_refuses_a_blank_label(planogram: Planogram) -> None:
    result = queue_planogram_update("   ", [imported_product("A1", UPC_1)], planogram)

    assert not result.ok


def test_applying_leaves_exactly_one_product_per_location(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1)
    place_product(planogram, "A1", UPC_2)
    update = queue_update(planogram, imported_product("A1", UPC_2), imported_product("B3", UPC_3))

    assert apply_planogram_update(update).ok

    assert layout_of(planogram) == {"A1": [UPC_2], "B3": [UPC_3]}


def test_applying_reports_home_locations_not_product_links(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1)
    place_product(planogram, "A1", UPC_2)
    place_product(planogram, "A2", UPC_3)
    update = queue_update(
        planogram,
        imported_product("A1", UPC_1),
        imported_product("A2", UPC_2),
        imported_product("A3", UPC_3),
    )

    result = apply_planogram_update(update)

    assert result.ok
    assert result.value.num_locations_removed == 2
    assert result.value.num_locations_added == 3


def test_invalid_upc_rolls_the_whole_apply_back(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1)
    update = queue_update(
        planogram, imported_product("A1", UPC_2), imported_product("A2", INVALID_UPC)
    )

    result = apply_planogram_update(update)

    assert not result.ok
    assert layout_of(planogram) == {"A1": [UPC_1]}
    update.refresh_from_db()
    assert update.status == PlanogramUpdate.Status.PENDING


def test_overlong_product_name_rolls_the_whole_apply_back(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1)
    update = queue_update(planogram, imported_product("A1", UPC_2, name="x" * 101))

    result = apply_planogram_update(update)

    assert not result.ok
    assert layout_of(planogram) == {"A1": [UPC_1]}


def test_second_apply_is_refused(planogram: Planogram) -> None:
    update = queue_update(planogram, imported_product("A1", UPC_1))
    stale_copy = PlanogramUpdate.objects.get(pk=update.pk)

    assert apply_planogram_update(update).ok

    assert not apply_planogram_update(stale_copy).ok


def test_superseded_update_cannot_be_applied(planogram: Planogram) -> None:
    first_update = queue_update(planogram, imported_product("A1", UPC_1))
    queue_update(planogram, imported_product("A1", UPC_2))

    result = apply_planogram_update(first_update)

    assert not result.ok
    assert layout_of(planogram) == {}


def test_old_plano_is_live_while_pending(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1)
    update = queue_update(planogram, imported_product("A1", UPC_2))

    place_product(planogram, "A2", UPC_3, name="Late addition")

    assert get_old_plano(update) == {
        "A1": [{"upc": UPC_1, "name": "Card"}],
        "A2": [{"upc": UPC_3, "name": "Late addition"}],
    }


def test_old_plano_is_frozen_once_applied(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1)
    update = queue_update(planogram, imported_product("A1", UPC_2))
    assert apply_planogram_update(update).ok

    place_product(planogram, "B1", UPC_3)

    update.refresh_from_db()
    assert get_old_plano(update) == {"A1": [{"upc": UPC_1, "name": "Card"}]}


def test_old_plano_lists_every_product_at_a_location(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1, name="Old version")
    place_product(planogram, "A1", UPC_2, name="New version")
    update = queue_update(planogram, imported_product("B3", UPC_2))

    assert get_old_plano(update) == {
        "A1": [
            {"upc": UPC_1, "name": "Old version"},
            {"upc": UPC_2, "name": "New version"},
        ]
    }


def test_old_plano_keeps_every_product_at_a_location_once_applied(planogram: Planogram) -> None:
    place_product(planogram, "A1", UPC_1, name="Old version")
    place_product(planogram, "A1", UPC_2, name="New version")
    update = queue_update(planogram, imported_product("A1", UPC_2))
    assert apply_planogram_update(update).ok

    update.refresh_from_db()
    assert get_old_plano(update) == {
        "A1": [
            {"upc": UPC_1, "name": "Old version"},
            {"upc": UPC_2, "name": "New version"},
        ]
    }


@pytest.fixture
def regular_user_client() -> Client:
    client = Client()
    client.force_login(get_user_model().objects.create_user(username="rep", password="x"))  # noqa: S106 -- test-only credential
    return client


@pytest.mark.parametrize(
    "route_name", ["product_locator:edit_planogram", "product_locator:create_planogram"]
)
def test_manage_endpoints_refuse_regular_users(
    regular_user_client: Client, route_name: str
) -> None:
    response = regular_user_client.post(reverse(route_name), {}, content_type="application/json")

    assert response.status_code == 403


def test_apply_endpoint_refuses_regular_users(
    regular_user_client: Client, planogram: Planogram
) -> None:
    update = queue_update(planogram, imported_product("A1", UPC_1))

    response = regular_user_client.post(
        reverse("product_locator:apply_planogram_update", args=[update.pk])
    )

    assert response.status_code == 403
    update.refresh_from_db()
    assert update.status == PlanogramUpdate.Status.PENDING


def test_delete_endpoint_refuses_regular_users(
    regular_user_client: Client, planogram: Planogram
) -> None:
    response = regular_user_client.delete(
        reverse("product_locator:delete_planogram", args=[planogram.pk])
    )

    assert response.status_code == 403
    assert Planogram.objects.filter(pk=planogram.pk).exists()


def test_apply_endpoint_lets_superusers_through(
    superuser_client: Client, planogram: Planogram
) -> None:
    update = queue_update(planogram, imported_product("A1", UPC_1))

    response = superuser_client.post(
        reverse("product_locator:apply_planogram_update", args=[update.pk])
    )

    assert response.status_code == 200
    assert layout_of(planogram) == {"A1": [UPC_1]}


@pytest.mark.parametrize(
    "route_name", ["product_locator:manage_planograms", "product_locator:planogram_updates"]
)
def test_manage_pages_refuse_regular_users(regular_user_client: Client, route_name: str) -> None:
    response = regular_user_client.get(reverse(route_name))

    assert response.status_code == 403


def product_counts_for_store(client: Client, planogram: Planogram) -> list[int]:
    response = client.get(
        reverse("product_locator:get_planograms_by_store", args=[planogram.store_id]),
        headers={"Accept": "application/json"},
    )
    assert response.status_code == 200
    return [entry["product_count"] for entry in response.json()["planograms"]]


def test_store_planograms_count_a_product_at_several_locations_once(
    regular_user_client: Client, planogram: Planogram
) -> None:
    place_product(planogram, "A1", UPC_1)
    place_product(planogram, "A1", UPC_2)
    place_product(planogram, "C4", UPC_1)

    assert product_counts_for_store(regular_user_client, planogram) == [2]


def test_store_planograms_count_an_empty_planogram_as_zero(
    regular_user_client: Client, planogram: Planogram
) -> None:
    HomeLocation.objects.create(name="A1", planogram=planogram)

    assert product_counts_for_store(regular_user_client, planogram) == [0]


def test_store_planograms_count_ignores_a_pending_update(
    regular_user_client: Client, planogram: Planogram
) -> None:
    place_product(planogram, "A1", UPC_1)
    queue_update(planogram, imported_product("A1", UPC_2), imported_product("A2", UPC_3))

    assert product_counts_for_store(regular_user_client, planogram) == [1]


@pytest.fixture
def superuser_client() -> Client:
    client = Client()
    client.force_login(get_user_model().objects.create_superuser(username="admin", password="x"))  # noqa: S106 -- test-only credential
    return client


def post_new_planogram(
    client: Client, store: Store, planogram_text_dump: str, name: str = "Fall Plano"
) -> Any:
    return client.post(
        reverse("product_locator:create_planogram"),
        {
            "name": name,
            "plano_type": Planogram.PlanoType.SEASONAL,
            "store_id": store.pk,
            "planogram_text_dump": planogram_text_dump,
        },
        content_type="application/json",
        headers={"Accept": "application/json"},
    )


@pytest.fixture
def store() -> Store:
    return Store.objects.create(name="T2000")


def test_creating_trims_the_planogram_name(superuser_client: Client, store: Store) -> None:
    response = post_new_planogram(superuser_client, store, "", name="  Fall Plano  ")

    assert response.status_code == 200
    assert store.planograms.get().name == "Fall Plano"


def test_creating_refuses_a_blank_planogram_name(superuser_client: Client, store: Store) -> None:
    response = post_new_planogram(superuser_client, store, "", name="   ")

    assert response.status_code == 400
    assert not store.planograms.exists()


def test_creating_with_a_text_dump_fills_the_new_planogram(
    superuser_client: Client, store: Store
) -> None:
    text_dump = f"A1 Section 1 {UPC_1} Cat Box\nA2 Section 1 {UPC_2} Spectacular"

    response = post_new_planogram(superuser_client, store, text_dump)

    assert response.status_code == 200
    assert response.json()["num_products_added"] == 2
    assert response.json()["num_products_parsed"] == 2
    assert layout_of(store.planograms.get()) == {"A1": [UPC_1], "A2": [UPC_2]}


def test_creating_with_a_text_dump_queues_no_planogram_update(
    superuser_client: Client, store: Store
) -> None:
    response = post_new_planogram(superuser_client, store, f"A1 Section 1 {UPC_1} Cat Box")

    assert response.status_code == 200
    assert not PlanogramUpdate.objects.exists()


def test_creating_with_a_text_dump_allows_two_products_at_one_location(
    superuser_client: Client, store: Store
) -> None:
    text_dump = f"A1 Section 1 {UPC_1} Cat Box\nA1 Section 1 {UPC_2} Spectacular"

    response = post_new_planogram(superuser_client, store, text_dump)

    assert response.status_code == 200
    assert layout_of(store.planograms.get()) == {"A1": [UPC_1, UPC_2]}


@pytest.mark.parametrize("blank_text_dump", ["", " \n\t "])
def test_creating_with_a_blank_text_dump_makes_an_empty_planogram(
    superuser_client: Client, store: Store, blank_text_dump: str
) -> None:
    response = post_new_planogram(superuser_client, store, blank_text_dump)

    assert response.status_code == 200
    assert response.json()["num_products_parsed"] == 0
    assert layout_of(store.planograms.get()) == {}


def test_unparseable_text_dump_creates_no_planogram(superuser_client: Client, store: Store) -> None:
    response = post_new_planogram(superuser_client, store, "not a planogram line")

    assert response.status_code == 400
    assert not store.planograms.exists()


def test_invalid_product_in_text_dump_creates_no_planogram(
    superuser_client: Client, store: Store
) -> None:
    overlong_name = "x" * 101

    response = post_new_planogram(superuser_client, store, f"A1 Section 1 {UPC_1} {overlong_name}")

    assert response.status_code == 400
    assert not store.planograms.exists()
    assert not Product.objects.filter(upc=UPC_1).exists()


def post_planogram_edit(client: Client, planogram: Planogram, **overrides: Any) -> Any:
    return client.post(
        reverse("product_locator:edit_planogram"),
        {
            "planogram_id": planogram.pk,
            "name": planogram.name,
            "plano_type": planogram.plano_type,
            "planogram_text_dump": "",
            "is_reset_planogram": False,
            "label": "",
            **overrides,
        },
        content_type="application/json",
        headers={"Accept": "application/json"},
    )


def test_editing_renames_a_planogram(superuser_client: Client, planogram: Planogram) -> None:
    response = post_planogram_edit(superuser_client, planogram, name="  Fall Plano  ")

    assert response.status_code == 200
    assert response.json()["planogram"]["name"] == "Fall Plano"
    assert response.json()["num_products_parsed"] is None
    planogram.refresh_from_db()
    assert planogram.name == "Fall Plano"


def test_editing_changes_the_planogram_type(superuser_client: Client, planogram: Planogram) -> None:
    response = post_planogram_edit(
        superuser_client, planogram, plano_type=Planogram.PlanoType.SEASONAL
    )

    assert response.status_code == 200
    planogram.refresh_from_db()
    assert planogram.plano_type == Planogram.PlanoType.SEASONAL


def test_editing_refuses_an_unknown_planogram_type(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_planogram_edit(superuser_client, planogram, plano_type="bogus")

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.plano_type == Planogram.PlanoType.REGULAR


def test_editing_refuses_a_blank_name(superuser_client: Client, planogram: Planogram) -> None:
    response = post_planogram_edit(superuser_client, planogram, name="   ")

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.name == "Inline"


def test_editing_refuses_a_name_used_by_an_outdated_planogram_in_the_store(
    superuser_client: Client, planogram: Planogram
) -> None:
    Planogram.objects.create(name="Old Plano", store=planogram.store, date_end="2026-01-01")

    response = post_planogram_edit(superuser_client, planogram, name="Old Plano")

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.name == "Inline"


def test_editing_allows_a_name_used_in_another_store(
    superuser_client: Client, planogram: Planogram, store: Store
) -> None:
    Planogram.objects.create(name="Fall Plano", store=store)

    response = post_planogram_edit(superuser_client, planogram, name="Fall Plano")

    assert response.status_code == 200


def test_editing_with_a_text_dump_saves_the_name_and_the_products(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_planogram_edit(
        superuser_client,
        planogram,
        name="Fall Plano",
        planogram_text_dump=f"A1 Section 1 {UPC_1} Cat Box",
    )

    assert response.status_code == 200
    assert response.json()["num_products_added"] == 1
    assert response.json()["num_products_parsed"] == 1
    planogram.refresh_from_db()
    assert planogram.name == "Fall Plano"
    assert layout_of(planogram) == {"A1": [UPC_1]}


def test_editing_with_a_reset_queues_an_update_and_saves_the_name(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_planogram_edit(
        superuser_client,
        planogram,
        name="Fall Plano",
        planogram_text_dump=f"A1 Section 1 {UPC_1} Cat Box",
        is_reset_planogram=True,
        label="Fall reset",
    )

    assert response.status_code == 200
    assert response.json()["planogram_update"]["label"] == "Fall reset"
    planogram.refresh_from_db()
    assert planogram.name == "Fall Plano"
    assert layout_of(planogram) == {}


def test_editing_with_a_reset_needs_a_text_dump(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_planogram_edit(
        superuser_client, planogram, name="Fall Plano", is_reset_planogram=True, label="Fall reset"
    )

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.name == "Inline"


@pytest.mark.parametrize(
    "failing_overrides",
    [
        {"planogram_text_dump": "not a planogram line"},
        {"planogram_text_dump": f"A1 Section 1 {UPC_1} {'x' * 101}"},
        {
            "planogram_text_dump": f"A1 Section 1 {UPC_1} Cat Box",
            "is_reset_planogram": True,
            "label": "   ",
        },
    ],
    ids=["unparseable-dump", "invalid-product", "reset-without-label"],
)
def test_failed_edit_saves_nothing(
    superuser_client: Client, planogram: Planogram, failing_overrides: dict[str, Any]
) -> None:
    response = post_planogram_edit(
        superuser_client,
        planogram,
        name="Fall Plano",
        plano_type=Planogram.PlanoType.SEASONAL,
        **failing_overrides,
    )

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.name == "Inline"
    assert planogram.plano_type == Planogram.PlanoType.REGULAR
    assert layout_of(planogram) == {}
    assert not PlanogramUpdate.objects.exists()


@pytest.mark.parametrize("location", ["XYZ", "14", "Bl", "A_1", "A1Z9", "A1234"])
def test_parsing_rejects_a_location_that_is_not_a_letter_and_digits(location: str) -> None:
    line = f"Cat Box {UPC_1} {location}"

    product_list, parse_errors = parse_data(line)

    assert product_list == []
    assert parse_errors == [f"No data was parsed from line: {line}"]


@pytest.mark.parametrize(
    "line",
    [
        f"Cat Box {UPC_1} XYZ Dog Toy {UPC_2} A1",
        f"Cat Box {UPC_1} A1 Dog Toy {UPC_2} XYZ",
        f"A1 Section 1 {UPC_1} Cat Box XYZ Section 1 {UPC_2} Dog Toy",
        f"XYZ Section 1 {UPC_1} Cat Box A1 Section 1 {UPC_2} Dog Toy",
        f"Cat Box {UPC_1} A12.5",
        f"Cat Box {UPC_1} A1-2",
    ],
    ids=[
        "tail-bad-first",
        "tail-bad-last",
        "section-bad-last",
        "section-bad-first",
        "trailing-dot",
        "trailing-dash",
    ],
)
def test_parsing_rejects_a_line_with_any_malformed_entry(line: str) -> None:
    product_list, parse_errors = parse_data(line)

    assert product_list == []
    assert parse_errors == [f"No data was parsed from line: {line}"]


def test_parsing_reads_several_entries_on_one_line() -> None:
    product_list, parse_errors = parse_data(f"Cat Box {UPC_1} A1 Dog Toy {UPC_2} A2")

    assert parse_errors == []
    assert sorted(product["upc"] for product in product_list) == sorted([UPC_1, UPC_2])


@pytest.mark.parametrize(
    "line", [f"Cat Box {UPC_1} A123", f"A123 Section 1 {UPC_1} Cat Box"], ids=["tail", "section"]
)
def test_parsing_accepts_a_three_digit_location(line: str) -> None:
    product_list, parse_errors = parse_data(line)

    assert parse_errors == []
    assert product_list == [{"upc": UPC_1, "name": "Cat Box", "location": "A123"}]


def test_creating_with_a_bad_location_creates_no_planogram(
    superuser_client: Client, store: Store
) -> None:
    response = post_new_planogram(superuser_client, store, f"Cat Box {UPC_1} XYZ")

    assert response.status_code == 400
    assert not store.planograms.exists()


def test_editing_with_a_bad_location_saves_nothing(
    superuser_client: Client, planogram: Planogram
) -> None:
    response = post_planogram_edit(
        superuser_client,
        planogram,
        name="Fall Plano",
        planogram_text_dump=f"Cat Box {UPC_1} XYZ",
    )

    assert response.status_code == 400
    planogram.refresh_from_db()
    assert planogram.name == "Inline"
    assert layout_of(planogram) == {}
