import logging
from typing import Any, cast

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Prefetch
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.exceptions import ValidationError as DrfValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DrfRequest

from server.utils.common import error_json_response, validate_structure

from .. import planogram_parser, planogram_updates, util
from ..models import HomeLocation, Planogram, PlanogramUpdate, Product, ProductScanAudit, Store
from . import interfaces_response
from .interfaces_request import (
    GetProductLocationRequest,
    IAddNewProductLocation,
    IAppendScanAudit,
    ICreatePlanogram,
    IEditPlanogram,
    INewScanAuditRequest,
)
from .permissions import IsSuperuser

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
                    planogram__store__pk=store_id, planogram__in=Planogram.get_current_planograms()
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
        name=util.normalize_location_name(request_data.location), planogram=planogram
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_planograms_by_store(request: DrfRequest, store_id: int) -> HttpResponse:
    planograms = (
        Planogram.objects.filter(store__pk=store_id)
        .annotate(product_count=Count("locations__products", distinct=True))
        .order_by("-date_start")
    )

    return interfaces_response.IPlanogramsByStore(
        planograms=[
            interfaces_response.TStorePlanogram(
                planogram=planogram, product_count=planogram.product_count
            )
            for planogram in planograms
        ]
    ).render(request)


@api_view(["DELETE"])
@permission_classes([IsSuperuser])
def delete_planogram(request: DrfRequest, planogram_id: int) -> HttpResponse:
    planogram = Planogram.objects.filter(pk=planogram_id).first()

    if planogram is None:
        raise DrfNotFound(f"Planogram with ID {planogram_id} not found")

    planogram.delete()

    return interfaces_response.ISuccess(success=True).render(request)


@api_view(["POST"])
@permission_classes([IsSuperuser])
def apply_planogram_update(request: DrfRequest, planogram_update_id: int) -> HttpResponse:
    planogram_update = PlanogramUpdate.objects.filter(pk=planogram_update_id).first()

    if planogram_update is None:
        return error_json_response(
            [f"PlanogramUpdate with ID {planogram_update_id} not found"], status=404
        )

    apply_result = planogram_updates.apply_planogram_update(planogram_update)
    if not apply_result.ok:
        return error_json_response(apply_result.err, status=400)

    return interfaces_response.IPlanogramUpdateApplied(
        planogram_update=apply_result.value.planogram_update,
        num_locations_removed=apply_result.value.num_locations_removed,
        num_locations_added=apply_result.value.num_locations_added,
    ).render(request)


@api_view(["POST"])
@permission_classes([IsSuperuser])
def edit_planogram(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, IEditPlanogram)

    planogram = (
        Planogram.objects.select_related("store").filter(pk=request_data.planogram_id).first()
    )
    if planogram is None:
        return error_json_response(
            [f"Planogram with ID {request_data.planogram_id} not found"], status=404
        )

    planogram.name = request_data.name.strip()
    planogram.plano_type = request_data.plano_type
    # full_clean parses the raw string into a date
    planogram.date_end = cast("Any", request_data.date_end or None)
    try:
        planogram.full_clean()
    except ValidationError as ex:
        return error_json_response(ex.messages, status=400)

    with transaction.atomic():
        text_dump_result = planogram_updates.apply_planogram_text_dump(
            request_data.planogram_text_dump,
            planogram,
            is_reset_planogram=request_data.is_reset_planogram,
            label=request_data.label,
        )
        if text_dump_result.ok:
            planogram.save(update_fields=["name", "plano_type", "date_end"])

    if not text_dump_result.ok:
        return error_json_response(text_dump_result.err, status=400)

    return interfaces_response.IPlanogramEdited(
        planogram=planogram,
        num_products_added=text_dump_result.value.num_products_added,
        num_products_parsed=text_dump_result.value.num_products_parsed,
        planogram_update=text_dump_result.value.planogram_update,
    ).render(request)


@api_view(["POST"])
@permission_classes([IsSuperuser])
def create_planogram(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, ICreatePlanogram)

    store = Store.objects.filter(pk=request_data.store_id).first()
    if store is None:
        raise DrfNotFound(f"Store with ID {request_data.store_id} not found")

    planogram_kwargs: dict[str, Any] = {
        "name": request_data.name.strip(),
        "plano_type": request_data.plano_type,
        "store": store,
    }
    if request_data.horizontal_section_thresholds is not None:
        planogram_kwargs["horizontal_section_thresholds"] = (
            request_data.horizontal_section_thresholds
        )

    planogram = Planogram(**planogram_kwargs)
    try:
        planogram.full_clean()
    except ValidationError as ex:
        raise DrfValidationError(ex.messages) from ex

    planogram_text_dump = request_data.planogram_text_dump
    product_list, parse_errors = (
        planogram_parser.parse_data(planogram_text_dump)
        if planogram_text_dump.strip()
        else ([], [])
    )
    if parse_errors:
        return error_json_response(parse_errors, status=400)

    with transaction.atomic():
        planogram.save()

        add_result = util.add_location_records(product_list, planogram)
        if not add_result.ok:
            # Roll back the planogram too -- a failed text dump must not leave it behind empty.
            transaction.set_rollback(True)
            return error_json_response(add_result.err, status=400)

    logger.info("Created planogram '%s' for store '%s'", planogram.name, store.name)

    return interfaces_response.IPlanogramCreated(
        planogram=planogram,
        num_products_added=add_result.value,
        num_products_parsed=len(product_list),
    ).render(request)
