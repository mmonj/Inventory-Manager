from typing import List, NamedTuple
from reactivated import Pick, template

from .forms import PlanogramForm
from .models import Planogram, ProductScanAudit, Store


@template
class ProductLocatorIndex(NamedTuple):
    stores: List[Pick[Store, "pk", "name"]]
    planograms: List[Pick[Planogram, "pk", "name", "date_start", "date_end", "store.pk"]]


@template
class ProductLocatorAddNewProducts(NamedTuple):
    form: PlanogramForm


@template
class ScanAuditPage(NamedTuple):
    previous_audits: List[
        Pick[ProductScanAudit, "pk", "product_type", "datetime_created", "products_in_stock.upc"]
    ]
