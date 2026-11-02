from typing import Any

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection
from django.db.migrations.executor import MigrationExecutor
from django.test import Client
from django.urls import reverse

from .home_location_names import is_valid_location_name, normalize_location_name
from .home_locations import add_location_records
from .models import HomeLocation, Planogram, PlanogramUpdate, Store
from .planogram_parser import parse_data
from .planogram_updates import queue_planogram_update

pytestmark = pytest.mark.django_db

UPC_1 = "012345678905"
UPC_2 = "843740198695"


@pytest.fixture
def planogram() -> Planogram:
    store = Store.objects.create(name="T1000")
    return Planogram.objects.create(name="Inline", store=store)


@pytest.fixture
def logged_in_client() -> Client:
    user = get_user_model().objects.create_user(username="location_tester")
    client = Client()
    client.force_login(user)
    return client


def add_location_through_view(
    client: Client, planogram: Planogram, location: str, upc: str
) -> None:
    response = client.post(
        reverse("product_locator:add_new_product_location"),
        data={
            "upc": upc,
            "product_name": "Card",
            "location": location,
            "planogram_id": planogram.pk,
        },
        content_type="application/json",
    )
    assert response.status_code == 200


def test_parsing_uppercases_locations() -> None:
    parse_result = parse_data(f"Card {UPC_1} b12\n")

    assert parse_result.ok
    assert parse_result.value == [{"upc": UPC_1, "name": "Card", "location": "B12"}]


@pytest.mark.parametrize(
    "line",
    [f"Card {UPC_1} b123", f"b123 Section 1 {UPC_1} Card"],
    ids=["tail", "section"],
)
def test_parsing_accepts_and_uppercases_a_three_digit_location(line: str) -> None:
    parse_result = parse_data(line)

    assert parse_result.ok
    assert parse_result.value == [{"upc": UPC_1, "name": "Card", "location": "B123"}]


@pytest.mark.parametrize("location", ["B", "B1234", "BB1", "1B", "B1Z", "OUTDATED99"])
def test_parsing_rejects_a_name_outside_the_grammar(location: str) -> None:
    line = f"Card {UPC_1} {location}"

    parse_result = parse_data(line)

    assert not parse_result.ok
    assert parse_result.err == [f"No data was parsed from line: {line}"]


@pytest.mark.parametrize("name", [" a15 ", "a15", "A15", "\ta15\n"])
def test_normalizing_strips_and_uppercases(name: str) -> None:
    assert normalize_location_name(name) == "A15"


@pytest.mark.parametrize("name", ["A1", "Z99", "B123"])
def test_validity_check_accepts_a_letter_and_one_to_three_digits(name: str) -> None:
    assert is_valid_location_name(name)


@pytest.mark.parametrize(
    "name",
    [
        "",
        "A",
        "1",
        "A1234",
        "AB1",
        "1A",
        "A1Z",
        "A 1",
        "OUTDATED99",
        "NOT A LOCATION",
        "A1\n",
        "a1",
    ],
)
def test_validity_check_rejects_anything_else(name: str) -> None:
    assert not is_valid_location_name(name)


def test_manual_add_treats_case_and_whitespace_variants_as_one_location(
    logged_in_client: Client, planogram: Planogram
) -> None:
    add_location_through_view(logged_in_client, planogram, "A1", UPC_1)
    add_location_through_view(logged_in_client, planogram, " a1 ", UPC_2)

    home_location = planogram.locations.get()
    assert home_location.name == "A1"
    assert sorted(product.upc for product in home_location.products.all()) == [UPC_1, UPC_2]


def test_import_with_both_spellings_shares_one_location(planogram: Planogram) -> None:
    parse_result = parse_data(f"Card {UPC_1} a1\nCard {UPC_2} A1\n")
    assert parse_result.ok

    add_result = add_location_records(parse_result.value, planogram)

    assert add_result.ok
    home_location = planogram.locations.get()
    assert home_location.name == "A1"
    assert sorted(product.upc for product in home_location.products.all()) == [UPC_1, UPC_2]


def test_queueing_refuses_both_spellings_as_a_location_used_twice(planogram: Planogram) -> None:
    parse_result = parse_data(f"Card {UPC_1} a1\nCard {UPC_2} A1\n")
    assert parse_result.ok

    queue_result = queue_planogram_update("Update", parse_result.value, planogram)

    assert not queue_result.ok
    assert queue_result.err == ["Location A1 has more than one product in the new layout."]
    assert not PlanogramUpdate.objects.exists()


@pytest.mark.parametrize("name", ["a1", " A1", "A1 "])
def test_validation_rejects_a_non_canonical_name(planogram: Planogram, name: str) -> None:
    with pytest.raises(ValidationError):
        HomeLocation(name=name, planogram=planogram).full_clean()


@pytest.mark.parametrize("name", ["a1", " A1", "A1 "])
def test_database_rejects_a_non_canonical_name(planogram: Planogram, name: str) -> None:
    with pytest.raises(IntegrityError):
        HomeLocation.objects.bulk_create([HomeLocation(name=name, planogram=planogram)])


@pytest.mark.django_db(transaction=True)
def test_migration_merges_case_variants_and_canonicalizes_names() -> None:
    pre_merge_node = [("product_locator", "0010_planogramupdate_status")]
    executor = MigrationExecutor(connection)
    latest_nodes = executor.loader.graph.leaf_nodes()
    executor.migrate(pre_merge_node)

    try:
        old_apps: Any = executor.loader.project_state(pre_merge_node).apps
        old_home_location_model = old_apps.get_model("product_locator", "HomeLocation")
        old_product_model = old_apps.get_model("product_locator", "Product")
        old_store = old_apps.get_model("product_locator", "Store").objects.create(name="T1")
        old_planogram = old_apps.get_model("product_locator", "Planogram").objects.create(
            name="Inline", store=old_store
        )
        other_planogram = old_apps.get_model("product_locator", "Planogram").objects.create(
            name="Other", store=old_store
        )

        lowercase_location = old_home_location_model.objects.create(
            name="a1", planogram=old_planogram
        )
        uppercase_location = old_home_location_model.objects.create(
            name="A1", planogram=old_planogram
        )
        lone_location = old_home_location_model.objects.create(
            name="Outdated99", planogram=old_planogram
        )
        other_location = old_home_location_model.objects.create(
            name="a1", planogram=other_planogram
        )

        product_at_both = old_product_model.objects.create(upc=UPC_1, name="Both")
        product_at_both.home_locations.add(lowercase_location, uppercase_location)
        product_at_lowercase = old_product_model.objects.create(upc=UPC_2, name="Lowercase")
        product_at_lowercase.home_locations.add(lowercase_location, other_location)
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(latest_nodes)

    migrated_planogram = Planogram.objects.get(name="Inline")
    assert sorted(location.name for location in migrated_planogram.locations.all()) == [
        "A1",
        "OUTDATED99",
    ]
    merged_location = migrated_planogram.locations.get(name="A1")
    assert merged_location.pk == uppercase_location.pk
    assert lone_location.pk in {location.pk for location in migrated_planogram.locations.all()}
    assert sorted(product.upc for product in merged_location.products.all()) == [UPC_1, UPC_2]
    assert Planogram.objects.get(name="Other").locations.get().name == "A1"
