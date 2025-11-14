import logging

from django.core.exceptions import ValidationError
from django.db.models import Prefetch
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.exceptions import ValidationError as DrfValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DrfRequest

from server.utils.common import validate_structure

from ..models import HomeLocation, Planogram, Product, ProductScanAudit
from . import interfaces_response
from .interfaces_request import (
    GetProductLocationRequest,
    IAddNewProductLocation,
    IAppendScanAudit,
    INewScanAuditRequest,
)

logger = logging.getLogger("main_logger")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_product_location(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.GET, GetProductLocationRequest)
    try:
        Product(upc=request_data.upc).clean()
    except ValidationError as ex:
        raise DrfValidationError(ex.messages) from ex

    product = (
        Product.objects.prefetch_related(
            Prefetch(
                "home_locations",
                queryset=HomeLocation.objects.filter(planogram__store__pk=request_data.store_id)
                .select_related("planogram")
                .order_by("-planogram__date_start"),
            ),
        )
        .filter(upc=request_data.upc)
        .first()
    )

    if product is None:
        raise DrfNotFound(f"Product with UPC {request_data.upc} not found")

    return interfaces_response.IProductLocations(product).render(request)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_product_locations_by_name(
    request: DrfRequest, store_id: int, product_name: str
) -> HttpResponse:
    products = (
        Product.objects.filter(name__icontains=product_name)
        .order_by("name")
        .prefetch_related(
            Prefetch(
                "home_locations",
                queryset=HomeLocation.objects.filter(
                    planogram__store__pk=store_id, planogram__date_end__isnull=True
                ),
            )
        )
    )

    return interfaces_response.MatchingProducts(
        [p for p in products if p.home_locations.all()]
    ).render(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_new_product_location(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, IAddNewProductLocation)

    product = Product.objects.filter(upc=request_data.upc).first()
    if product is None:
        try:
            product = Product.objects.create(upc=request_data.upc, name=request_data.product_name)
        except ValidationError as ex:
            raise DrfValidationError(ex.messages) from ex

    planogram = Planogram.objects.get(id=request_data.planogram_id)
    location, _is_new_location = HomeLocation.objects.select_related("planogram").get_or_create(
        name=request_data.location, planogram=planogram
    )

    if location not in product.home_locations.select_related("planogram", "planogram__store").all():
        logger.info("Adding location '%s' to product '%s'", location, product)
        product.home_locations.add(location)

    return interfaces_response.IHomeLocationUpdate(home_location=location).render(request)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_upc_to_scan_audit(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, IAppendScanAudit)

    scan_audit = ProductScanAudit.objects.filter(pk=request_data.scan_audit_id).first()
    if scan_audit is None:
        raise DrfNotFound(f"Scan Audit ID '{request_data.scan_audit_id}' not found")

    product = Product.objects.filter(upc=request_data.upc).first()
    if product is None:
        product = Product.objects.create(upc=request_data.upc, name="")

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
