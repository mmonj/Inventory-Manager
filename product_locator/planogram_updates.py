import logging
from collections import Counter
from typing import NamedTuple

from django.db import transaction

from server.utils.typedefs import TFailure, TResult, TSuccess

from .models import Planogram, PlanogramUpdate
from .types import IImportedProductInfo, TNewPlanoSnapshot, TOldPlanoSnapshot
from .util import add_location_records

logger = logging.getLogger("main_logger")


class TAppliedPlanogramUpdate(NamedTuple):
    planogram_update: PlanogramUpdate
    num_locations_removed: int
    num_locations_added: int


def queue_planogram_update(
    label: str, product_list: list[IImportedProductInfo], planogram: Planogram
) -> TResult[PlanogramUpdate, list[str]]:
    """
    Queue a new layout for the planogram, superseding its pending update if there is one.
    """
    cleaned_label = label.strip()
    if not cleaned_label:
        return TFailure(["A label is required when resetting a planogram."])

    location_counts = Counter(product_data["location"] for product_data in product_list)
    duplicate_location_errors = [
        f"Location {location} has more than one product in the new layout."
        for location, count in location_counts.items()
        if count > 1
    ]
    if duplicate_location_errors:
        return TFailure(duplicate_location_errors)

    with transaction.atomic():
        superseded_count = planogram.planogram_updates.filter(
            status=PlanogramUpdate.Status.PENDING
        ).update(status=PlanogramUpdate.Status.SUPERSEDED)
        if superseded_count > 0:
            logger.info(
                "%d pending update(s) for planogram '%s' have been superseded",
                superseded_count,
                planogram,
            )

        planogram_update = PlanogramUpdate.objects.create(
            label=cleaned_label,
            planogram=planogram,
            new_plano=_build_new_plano(product_list),
        )

    return TSuccess(planogram_update)


def apply_planogram_update(
    planogram_update: PlanogramUpdate,
) -> TResult[TAppliedPlanogramUpdate, list[str]]:
    """
    Replace the planogram's home locations with the update's new layout, all or nothing.
    """
    with transaction.atomic():
        locked_update = (
            PlanogramUpdate.objects.select_for_update().filter(pk=planogram_update.pk).first()
        )
        if locked_update is None:
            return TFailure(["This planogram update no longer exists."])
        if locked_update.status == PlanogramUpdate.Status.APPLIED:
            return TFailure(["This planogram update has already been applied."])
        if locked_update.status == PlanogramUpdate.Status.SUPERSEDED:
            return TFailure(["This planogram update was replaced by a newer one."])

        planogram = locked_update.planogram
        old_plano = _build_old_plano(planogram)
        num_locations_removed = planogram.locations.count()
        planogram.locations.all().delete()
        logger.info("Deleted all existing home locations for planogram: %s", planogram)

        product_list: list[IImportedProductInfo] = [
            {"location": location, "upc": product["upc"], "name": product["name"]}
            for location, product in locked_update.new_plano.items()
        ]
        add_result = add_location_records(product_list, planogram)
        if not add_result.ok:
            # Roll back the delete too -- an invalid product must not leave the planogram cleared
            # out with nothing re-added.
            transaction.set_rollback(True)
            return TFailure(add_result.err)

        locked_update.old_plano = old_plano
        locked_update.status = PlanogramUpdate.Status.APPLIED
        locked_update.save(update_fields=["old_plano", "status"])

        return TSuccess(
            TAppliedPlanogramUpdate(
                planogram_update=locked_update,
                num_locations_removed=num_locations_removed,
                num_locations_added=planogram.locations.count(),
            )
        )


def get_old_plano(planogram_update: PlanogramUpdate) -> TOldPlanoSnapshot:
    """
    The layout the update starts from: live while pending, fixed once applied.
    """
    if planogram_update.status == PlanogramUpdate.Status.PENDING:
        return _build_old_plano(planogram_update.planogram)

    return planogram_update.old_plano or {}


def _build_old_plano(planogram: Planogram) -> TOldPlanoSnapshot:
    old_plano: TOldPlanoSnapshot = {}

    for home_location in planogram.locations.prefetch_related("products").all():
        products = sorted(home_location.products.all(), key=lambda product: product.pk)
        if products:
            old_plano[home_location.name] = [
                {"upc": product.upc, "name": product.name} for product in products
            ]

    return old_plano


def _build_new_plano(product_list: list[IImportedProductInfo]) -> TNewPlanoSnapshot:
    return {
        product_data["location"]: {"upc": product_data["upc"], "name": product_data["name"]}
        for product_data in product_list
    }
