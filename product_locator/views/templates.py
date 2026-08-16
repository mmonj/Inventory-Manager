from typing import NamedTuple

from reactivated import Pick, template

from ..models import Planogram, ProductScanAudit, Store
from ..types import IPlanoProduct


@template
class ProductLocatorIndex(NamedTuple):
    pass


@template
class ProductLocatorScanner(NamedTuple):
    stores: list[Pick[Store, "pk", "name"]]
    planograms: list[Pick[Planogram, "pk", "name", "date_start", "date_end", "store.pk"]]


@template
class ProductLocatorManagePlanograms(NamedTuple):
    stores: list[Pick[Store, "pk", "name"]]
    plano_type_choices: list[Planogram.TPlanoType]
    default_plano_name: str


@template
class ProductLocatorScanAudit(NamedTuple):
    previous_audits: list[
        Pick[ProductScanAudit, "pk", "product_type", "datetime_created", "products_in_stock.upc"]
    ]


class TPlanogramUpdate(NamedTuple):
    pk: int
    label: str
    is_applied: bool
    old_plano: dict[str, IPlanoProduct]
    new_plano: dict[str, IPlanoProduct]
    planogram: Pick[Planogram, "pk", "name", "store.pk", "store.name"]


@template
class ProductLocatorPlanogramUpdates(NamedTuple):
    planogram_updates: list[TPlanogramUpdate]
