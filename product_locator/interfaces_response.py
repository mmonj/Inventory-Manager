from typing import List, NamedTuple
from reactivated import Pick, interface

from .models import Product


@interface
class MatchingProducts(NamedTuple):
    products: List[
        Pick[
            Product,
            "pk",
            "name",
            "home_locations.pk",
            "home_locations.name",
            "home_locations.planogram.pk",
            "home_locations.planogram.name",
            "home_locations.display_name",
        ]
    ]
