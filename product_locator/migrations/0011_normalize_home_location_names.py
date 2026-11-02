import logging
from collections import defaultdict
from typing import Any

from django.db import migrations

logger = logging.getLogger("main_logger")


def merge_home_locations_into_canonical_names(apps: Any, _schema_editor: Any) -> None:
    HomeLocation = apps.get_model("product_locator", "HomeLocation")

    home_location_groups: dict[tuple[int, str], list[Any]] = defaultdict(list)
    for home_location in HomeLocation.objects.order_by("pk"):
        canonical_name = home_location.name.strip().upper()
        home_location_groups[(home_location.planogram_id, canonical_name)].append(home_location)

    for (planogram_id, canonical_name), home_locations in home_location_groups.items():
        survivor = next(
            (location for location in home_locations if location.name == canonical_name),
            home_locations[0],
        )

        for duplicate in home_locations:
            if duplicate.pk == survivor.pk:
                continue

            moved_products = list(duplicate.products.all())
            survivor.products.add(*moved_products)
            logger.info(
                "Merged home location '%s' into '%s' on planogram %s, UPCs moved: %s",
                duplicate.name,
                canonical_name,
                planogram_id,
                [product.upc for product in moved_products],
            )
            duplicate.delete()

        if survivor.name != canonical_name:
            HomeLocation.objects.filter(pk=survivor.pk).update(name=canonical_name)


class Migration(migrations.Migration):
    dependencies = [
        ("product_locator", "0010_planogramupdate_status"),
    ]

    operations = [
        migrations.RunPython(
            merge_home_locations_into_canonical_names, reverse_code=migrations.RunPython.noop
        ),
    ]
