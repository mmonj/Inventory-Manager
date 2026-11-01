import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

from .models import HomeLocation, Planogram, PlanogramUpdate, Product, Store
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
    "route_name", ["product_locator:submit_planogram_products", "product_locator:create_planogram"]
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


def test_apply_endpoint_lets_superusers_through(planogram: Planogram) -> None:
    update = queue_update(planogram, imported_product("A1", UPC_1))
    client = Client()
    client.force_login(get_user_model().objects.create_superuser(username="admin", password="x"))  # noqa: S106 -- test-only credential

    response = client.post(reverse("product_locator:apply_planogram_update", args=[update.pk]))

    assert response.status_code == 200
    assert layout_of(planogram) == {"A1": [UPC_1]}


@pytest.mark.parametrize(
    "route_name", ["product_locator:manage_planograms", "product_locator:planogram_updates"]
)
def test_manage_pages_refuse_regular_users(regular_user_client: Client, route_name: str) -> None:
    response = regular_user_client.get(reverse(route_name))

    assert response.status_code == 403
