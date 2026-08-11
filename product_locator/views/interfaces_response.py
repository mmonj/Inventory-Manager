from typing import NamedTuple

from reactivated import Pick, interface

from ..models import HomeLocation, Planogram, PlanogramUpdate, Product, ProductScanAudit


@interface
class IProductLocatorProduct(NamedTuple):
    product: Pick[Product, "pk", "upc", "name", "date_created"]


@interface
class MatchingProducts(NamedTuple):
    products: list[
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
    planograms: list[
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


@interface
class ISuccess(NamedTuple):
    success: bool


@interface
class IPlanogramUpdateApplied(NamedTuple):
    planogram_update: Pick[
        PlanogramUpdate,
        "pk",
        "label",
        "is_applied",
        "planogram.pk",
        "planogram.name",
    ]


@interface
class ISubmitPlanogramProductsResult(NamedTuple):
    num_products_added: int | None
    num_products_parsed: int | None
    planogram_update: Pick[PlanogramUpdate, "pk", "label"] | None
