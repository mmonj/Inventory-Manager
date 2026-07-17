import logging

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpRequest

from .models import HomeLocation, Planogram, PlanogramUpdate, Product
from .types import IImportedProductInfo, TPlanoSnapshot

logger = logging.getLogger("main_logger")


def add_location_records(
    product_list: list[IImportedProductInfo],
    planogram: Planogram,
    request: HttpRequest,
) -> int:
    new_locations = [
        HomeLocation(name=product_data["location"], planogram=planogram)
        for product_data in product_list
    ]

    logger.info("Bulk creating %d new locations", len(new_locations))

    HomeLocation.objects.bulk_create(new_locations, 100, ignore_conflicts=True)
    home_locations: dict[str, HomeLocation] = {loc.name: loc for loc in planogram.locations.all()}

    num_products_added = 0
    for product_data in product_list:
        product = Product.objects.filter(upc=product_data["upc"]).first()
        if product is None:
            try:
                product = Product.objects.create(upc=product_data["upc"], name=product_data["name"])
            except ValidationError as ex:
                logger.exception("Errors in creating new product: %s", ex.messages)
                for msg in ex.messages:
                    messages.error(
                        request,
                        f"{' '.join(product_data.values())}: {msg}",  # type:ignore [arg-type]
                    )
                continue

        num_products_added += 1
        home_location = home_locations.get(product_data["location"])
        if home_location is None:
            continue

        product.home_locations.add(home_location)

    return num_products_added


def build_plano_snapshot(planogram: Planogram) -> TPlanoSnapshot:
    snapshot: TPlanoSnapshot = {}

    for home_location in planogram.locations.prefetch_related("products").all():
        product = home_location.products.first()
        if product is None:
            continue

        snapshot[home_location.name] = {"upc": product.upc, "name": product.name}

    return snapshot


def build_new_plano_snapshot(product_list: list[IImportedProductInfo]) -> TPlanoSnapshot:
    return {
        product_data["location"]: {"upc": product_data["upc"], "name": product_data["name"]}
        for product_data in product_list
    }


def create_planogram_update(
    label: str, product_list: list[IImportedProductInfo], planogram: Planogram
) -> PlanogramUpdate:
    superseded_count = planogram.planogram_updates.filter(is_applied=False).update(is_applied=True)
    if superseded_count > 0:
        logger.info(
            "%d previously queued but unapplied update(s) for planogram '%s' have been invalidated",
            superseded_count,
            planogram,
        )

    return PlanogramUpdate.objects.create(
        label=label,
        planogram=planogram,
        old_plano=build_plano_snapshot(planogram),
        new_plano=build_new_plano_snapshot(product_list),
    )


def apply_planogram_update(planogram_update: PlanogramUpdate, request: HttpRequest) -> int:
    planogram = planogram_update.planogram

    planogram.locations.all().delete()
    logger.info("Deleted all existing home locations for planogram: %s", planogram)

    product_list: list[IImportedProductInfo] = [
        {"location": location, "upc": product["upc"], "name": product["name"]}
        for location, product in planogram_update.new_plano.items()
    ]

    num_products_added = add_location_records(product_list, planogram, request)

    planogram_update.is_applied = True
    planogram_update.save(update_fields=["is_applied"])

    return num_products_added
