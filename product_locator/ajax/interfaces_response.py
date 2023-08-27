from typing import NamedTuple
from reactivated import Pick, interface

from ..models import Product, ProductScanAudit


@interface
class IProductLocatorProduct(NamedTuple):
    product: Pick[Product, "pk", "upc", "name", "date_created"]


@interface
class IScanAuditCreation(NamedTuple):
    scan_audit: Pick[ProductScanAudit, "pk", "product_type", "datetime_created"]
