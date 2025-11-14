from typing import List, NamedTuple

from reactivated import Pick, interface

from ..models import HomeLocation, Planogram, Product, ProductScanAudit


@interface
class IProductLocatorProduct(NamedTuple):
    product: Pick[Product, "pk", "upc", "name", "date_created"]


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
            "home_locations.planogram.plano_type_info",
            "home_locations.display_name",
        ]
    ]


@interface
class IHomeLocationUpdate(NamedTuple):
    home_location: Pick[
        HomeLocation,
        "pk",
        "name",
        "planogram.pk",
        "planogram.name",
        "planogram.date_start",
        "planogram.date_end",
        "planogram.plano_type_info",
    ]


@interface
class IScanAuditCreation(NamedTuple):
    scan_audit: Pick[ProductScanAudit, "pk", "product_type", "datetime_created"]


@interface
class IPlanogramsByStore(NamedTuple):
    planograms: List[
        Pick[
            Planogram,
            "pk",
            "name",
            "date_start",
            "date_end",
            "plano_type_info",
        ]
    ]


@interface
class IProductLocations(NamedTuple):
    product: Pick[
        Product,
        "pk",
        "upc",
        "name",
        "date_created",
        "home_locations.pk",
        "home_locations.name",
        "home_locations.planogram.pk",
        "home_locations.planogram.name",
        "home_locations.planogram.date_start",
        "home_locations.planogram.date_end",
        "home_locations.planogram.plano_type_info",
    ]
