from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DrfRequest

from . import interfaces_response

from ..models import Product, ProductScanAudit

from .interfaces_request import IAppendScanAudit, INewScanAuditRequest

from api.util import validate_structure


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_upc_to_scan_audit(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, IAppendScanAudit)

    scan_audit = ProductScanAudit.objects.filter(pk=request_data.scan_audit_id).first()
    if scan_audit is None:
        raise DrfNotFound(f"Scan Audit ID '{request_data.scan_audit_id}' not found")

    product = Product.objects.filter(upc=request_data.upc).first()
    if product is None:
        product = Product.objects.create(upc=request_data.upc, name=None)

    scan_audit.products_in_stock.add(product)

    return interfaces_response.IProductLocatorProduct(product=product).render(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_new_scan_audit(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, INewScanAuditRequest)
    scan_audit = ProductScanAudit.objects.create(
        product_type=request_data.product_type.strip() or None
    )

    return interfaces_response.IScanAuditCreation(scan_audit=scan_audit).render(request)
