import logging

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpRequest

from .types import IImportedProductInfo

from .models import HomeLocation, Planogram, Product


logger = logging.getLogger("main_logger")


def add_location_records(
    product_list: list[IImportedProductInfo], planogram: Planogram, request: HttpRequest
) -> int:
    new_locations: list[HomeLocation] = []

    for product_data in product_list:
        new_locations.append(HomeLocation(name=product_data["location"], planogram=planogram))

    logger.info(f"Bulk creating {len(new_locations)} new locations")
    HomeLocation.objects.bulk_create(new_locations, 100, ignore_conflicts=True)

    home_locations = {loc.name: loc for loc in HomeLocation.objects.filter(planogram=planogram)}
    num_products_added = 0

    for product_data in product_list:
        product = Product.objects.filter(upc=product_data["upc"]).first()
        if product is None:
            try:
                product = Product.objects.create(upc=product_data["upc"], name=product_data["name"])
            except ValidationError as ex:
                logger.error(f"Errors in creating new product: {ex.messages}")
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
