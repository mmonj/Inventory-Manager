import pytest

from .models import Planogram, PlanogramUpdate, Store
from .planogram_import import import_planogram

pytestmark = pytest.mark.django_db

UPC_1 = "012345678905"
UPC_2 = "843740198695"


@pytest.fixture
def store() -> Store:
    return Store.objects.create(name="T1000")


def test_importing_saves_a_new_planogram_with_its_products(store: Store) -> None:
    planogram = Planogram(name="Inline", store=store)

    import_result = import_planogram(planogram, f"A1 Section 1 {UPC_1} Cat Box")

    assert import_result.ok
    assert import_result.value.num_products == 1
    assert import_result.value.planogram_update is None
    assert planogram.locations.get().products.get().upc == UPC_1


@pytest.fixture
def planogram(store: Store) -> Planogram:
    return Planogram.objects.create(name="Inline", store=store)


def test_importing_leaves_no_new_planogram_behind_when_a_product_is_invalid(store: Store) -> None:
    planogram = Planogram(name="Fall", store=store)

    import_result = import_planogram(planogram, f"A1 Section 1 {UPC_1} {'x' * 101}")

    assert not import_result.ok
    assert not Planogram.objects.filter(name="Fall").exists()


def test_importing_keeps_an_existing_planogram_unchanged_when_a_product_is_invalid(
    planogram: Planogram,
) -> None:
    planogram.name = "Renamed"

    import_result = import_planogram(planogram, f"A1 Section 1 {UPC_1} {'x' * 101}")

    assert not import_result.ok
    assert Planogram.objects.get(pk=planogram.pk).name == "Inline"


def test_importing_keeps_an_existing_planogram_unchanged_when_the_reset_fails(
    planogram: Planogram,
) -> None:
    planogram.name = "Renamed"

    import_result = import_planogram(planogram, f"A1 Section 1 {UPC_1} Card", reset_label=" ")

    assert not import_result.ok
    assert Planogram.objects.get(pk=planogram.pk).name == "Inline"


def test_importing_refuses_a_bad_planogram_before_touching_the_text_dump(store: Store) -> None:
    planogram = Planogram(name="", store=store)

    import_result = import_planogram(planogram, "not a text dump")

    assert not import_result.ok
    assert import_result.err == ["This field cannot be blank."]


def test_importing_a_blank_text_dump_saves_only_the_planogram(store: Store) -> None:
    planogram = Planogram(name="Fall", store=store)

    import_result = import_planogram(planogram, " \n\t ")

    assert import_result.ok
    assert import_result.value.num_products == 0
    assert planogram.pk is not None
    assert not planogram.locations.exists()


def test_a_reset_needs_a_text_dump(planogram: Planogram) -> None:
    import_result = import_planogram(planogram, " ", reset_label="Fall reset")

    assert not import_result.ok
    assert import_result.err == ["A planogram reset needs a planogram text dump."]


def test_a_reset_queues_an_update_and_leaves_the_layout_alone(planogram: Planogram) -> None:
    import_result = import_planogram(
        planogram, f"A1 Section 1 {UPC_1} Cat Box", reset_label="Fall reset"
    )

    assert import_result.ok
    assert import_result.value.num_products == 1
    planogram_update = import_result.value.planogram_update
    assert planogram_update is not None
    assert planogram_update.label == "Fall reset"
    assert planogram_update.status == PlanogramUpdate.Status.PENDING
    assert not planogram.locations.exists()


def test_a_reset_refuses_an_overlong_product_name_at_submit(planogram: Planogram) -> None:
    import_result = import_planogram(
        planogram, f"A1 Section 1 {UPC_1} {'x' * 120}", reset_label="Fall reset"
    )

    assert not import_result.ok
    assert "at most 100 characters" in import_result.err[0]
    assert not PlanogramUpdate.objects.exists()


def test_a_reset_refuses_an_overlong_label(planogram: Planogram) -> None:
    import_result = import_planogram(
        planogram, f"A1 Section 1 {UPC_1} Cat Box", reset_label="x" * 101
    )

    assert not import_result.ok
    assert import_result.err == ["Ensure this value has at most 100 characters (it has 101)."]
    assert not PlanogramUpdate.objects.exists()


def test_a_failed_reset_keeps_the_pending_update(planogram: Planogram) -> None:
    first_import = import_planogram(
        planogram, f"A1 Section 1 {UPC_1} Cat Box", reset_label="Fall reset"
    )
    assert first_import.ok

    second_import = import_planogram(
        planogram, f"A1 Section 1 {UPC_2} {'x' * 101}", reset_label="Newer reset"
    )

    assert not second_import.ok
    assert planogram.planogram_updates.get().status == PlanogramUpdate.Status.PENDING


def test_adding_allows_two_products_at_one_home_location(planogram: Planogram) -> None:
    import_result = import_planogram(
        planogram, f"A1 Section 1 {UPC_1} Cat Box\nA1 Section 1 {UPC_2} Dog Toy"
    )

    assert import_result.ok
    assert planogram.locations.get().products.count() == 2


def test_a_reset_refuses_two_products_at_one_home_location(planogram: Planogram) -> None:
    import_result = import_planogram(
        planogram,
        f"A1 Section 1 {UPC_1} Cat Box\nA1 Section 1 {UPC_2} Dog Toy",
        reset_label="Fall reset",
    )

    assert not import_result.ok
    assert import_result.err == ["Location A1 has more than one product in the new layout."]
