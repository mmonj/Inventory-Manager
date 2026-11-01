import logging

from django.core.exceptions import ValidationError
from django.db import transaction

from server.utils.typedefs import TFailure, TResult, TSuccess

from .models import HomeLocation, Planogram, Product
from .types import IImportedProductInfo

logger = logging.getLogger("main_logger")


def add_location_records(
    product_list: list[IImportedProductInfo],
    planogram: Planogram,
) -> TResult[int, list[str]]:
    """
    Validates every new product before writing anything. If any product is invalid, no
    HomeLocation/Product/relation writes from this call are persisted (all-or-nothing import).
    """
    product_errors: list[str] = []
    for product_data in product_list:
        if Product.objects.filter(upc=product_data["upc"]).exists():
            continue

        try:
            Product(upc=product_data["upc"], name=product_data["name"]).full_clean(
                validate_unique=False
            )
        except ValidationError as ex:
            logger.exception("Errors in creating new product: %s", ex.messages)
            product_errors.extend(
                f"{' '.join(product_data.values())}: {msg}"  # type:ignore [arg-type]
                for msg in ex.messages
            )

    if product_errors:
        return TFailure(product_errors)

    with transaction.atomic():
        new_locations = [
            HomeLocation(name=product_data["location"], planogram=planogram)
            for product_data in product_list
        ]

        logger.info("Bulk creating %d new locations", len(new_locations))

        HomeLocation.objects.bulk_create(new_locations, 100, ignore_conflicts=True)
        home_locations: dict[str, HomeLocation] = {
            loc.name: loc for loc in planogram.locations.all()
        }

        num_products_added = 0
        for product_data in product_list:
            product = Product.objects.filter(upc=product_data["upc"]).first()
            if product is None:
                product = Product.objects.create(upc=product_data["upc"], name=product_data["name"])

            num_products_added += 1
            home_location = home_locations.get(product_data["location"])
            if home_location is None:
                continue

            product.home_locations.add(home_location)

    return TSuccess(num_products_added)
