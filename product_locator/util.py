import logging

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpRequest

from .models import HomeLocation, Planogram, Product
from .types import IImportedProductInfo

logger = logging.getLogger("main_logger")


def add_location_records(
    product_list: list[IImportedProductInfo],
    planogram: Planogram,
    is_reset_planogram: bool,
    request: HttpRequest,
) -> tuple[int, list[HomeLocation]]:
    locations_that_are_updating: list[HomeLocation] = []

    if is_reset_planogram:
        existing_locations_map = {loc.name: loc for loc in planogram.locations.all()}
        for product_data in product_list:
            existing_location = existing_locations_map.get(product_data["location"])
            if existing_location is None:
                continue

            if product_data["upc"] not in existing_location.products.values_list("upc", flat=True):
                locations_that_are_updating.append(existing_location)

        locations_that_are_updating = sorted(locations_that_are_updating, key=lambda loc: loc.name)

    if is_reset_planogram:
        planogram.locations.all().delete()
        logger.info("Deleted all existing home locations for planogram: %s", planogram)

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

    return num_products_added, locations_that_are_updating
