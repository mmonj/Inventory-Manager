import logging
from itertools import islice

from django.core.exceptions import ValidationError

from . import models


logger = logging.getLogger("main_logger")


def add_location_records(product_list: dict, planogram: models.Planogram):
    new_locations = []

    for product_data in product_list:
        new_locations.append(models.HomeLocation(name=product_data["location"], planogram=planogram))

    logger.info(f"Bulk creating {len(new_locations)} new locations")
    bulk_create_in_batches(models.HomeLocation, iter(new_locations), ignore_conflicts=True)
    home_locations = models.HomeLocation.objects.filter(planogram=planogram)
    home_locations = {loc.name: loc for loc in home_locations}

    for product_data in product_list:
        try:
            product, _ = models.Product.objects.get_or_create(upc=product_data["upc"], name=product_data["name"])
            home_location = home_locations.get(product_data["location"])
            product.home_locations.add(home_location)
        except ValidationError as e:
            logger.error(f"Validation error for UPC: {[product_data['upc']]} - {product_data['name']} - {e}")
            continue


def bulk_create_in_batches(TargetModelClass, objs: iter, batch_size=100, ignore_conflicts=False):
    while True:
        batch = list(islice(objs, batch_size))
        if not batch:
            break
        TargetModelClass.objects.bulk_create(batch, batch_size, ignore_conflicts=ignore_conflicts)
