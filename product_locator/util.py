import logging

# from itertools import islice
# from typing import Iterator

from django.core.exceptions import ValidationError

from .models import HomeLocation, Planogram, Product


logger = logging.getLogger("main_logger")


def add_location_records(product_list: list[dict[str, str]], planogram: Planogram) -> None:
    new_locations = []

    for product_data in product_list:
        new_locations.append(HomeLocation(name=product_data["location"], planogram=planogram))

    logger.info(f"Bulk creating {len(new_locations)} new locations")

    HomeLocation.objects.bulk_create(new_locations, 100, ignore_conflicts=True)
    home_locations = {loc.name: loc for loc in HomeLocation.objects.filter(planogram=planogram)}

    for product_data in product_list:
        try:
            product, _ = Product.objects.get_or_create(
                upc=product_data["upc"], name=product_data["name"]
            )
            home_location = home_locations.get(product_data["location"])
            if home_location is None:
                continue

            product.home_locations.add(home_location)
        except ValidationError as e:
            logger.error(
                f"Validation error for UPC: {[product_data['upc']]} - {product_data['name']} - {e}"
            )
            continue


# def bulk_create_in_batches(
#     TargetModelClass, objs: Iterator, batch_size=100, ignore_conflicts=False
# ) -> None:
#     while True:
#         batch = list(islice(objs, batch_size))
#         if not batch:
#             break
#         TargetModelClass.objects.bulk_create(batch, batch_size, ignore_conflicts=ignore_conflicts)
