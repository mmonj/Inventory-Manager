import logging
from typing import Any, cast

from django.core.exceptions import ValidationError
from django.db.models import Count, Prefetch
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.exceptions import ValidationError as DrfValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DrfRequest

from server.utils.common import error_json_response, validate_structure

from .. import home_locations, planogram_import, planogram_updates
from ..models import HomeLocation, Planogram, PlanogramUpdate, Product, ProductScanAudit, Store
from . import interfaces_response
from .interfaces_request import (
    GetProductLocationRequest,
    IAddNewProductLocation,
    IAppendScanAudit,
    ICarryOverHomeLocations,
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

    planogram = Planogram.objects.filter(pk=request_data.planogram_id).first()
    if planogram is None:
        return error_json_response(
            [f"Planogram with ID {request_data.planogram_id} not found"], status=404
        )

    assign_result = home_locations.assign_home_location(
        request_data.upc,
        request_data.product_name,
        request_data.location,
        planogram,
        request_data.store_id,
    )
    if not assign_result.ok:
        return error_json_response(assign_result.err, status=400)

    return interfaces_response.IHomeLocationUpdate(home_location=assign_result.value).render(
        request
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def carry_over_home_locations(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, ICarryOverHomeLocations)

    older_product = Product.objects.filter(pk=request_data.older_product_id).first()
    if older_product is None:
        return error_json_response(
            [f"Product with ID {request_data.older_product_id} not found"], status=404
        )

    carryover_result = home_locations.carry_over_home_locations(
        request_data.upc, older_product, request_data.planogram_ids, request_data.store_id
    )
    if not carryover_result.ok:
        return error_json_response(carryover_result.err, status=400)

    return interfaces_response.IProductLocatorProduct(product=carryover_result.value).render(
        request
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_upc_to_scan_audit(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, IAppendScanAudit)

    scan_audit = ProductScanAudit.objects.filter(pk=request_data.scan_audit_id).first()
    if scan_audit is None:
        raise DrfNotFound(f"Scan Audit ID '{request_data.scan_audit_id}' not found")

    product_result = home_locations.find_or_create_product(request_data.upc)
    if not product_result.ok:
        return error_json_response(product_result.err, status=400)

    scan_audit.products_in_stock.add(product_result.value)

    return interfaces_response.IProductLocatorProduct(product=product_result.value).render(request)


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

    import_result = planogram_import.import_planogram(
        planogram,
        request_data.planogram_text_dump,
        reset_label=request_data.label if request_data.is_reset_planogram else None,
    )
    if not import_result.ok:
        return error_json_response(import_result.err, status=400)

    return interfaces_response.IPlanogramEdited(
        planogram=planogram,
        num_products=import_result.value.num_products,
        planogram_update=import_result.value.planogram_update,
    ).render(request)


@api_view(["POST"])
@permission_classes([IsSuperuser])
def create_planogram(request: DrfRequest) -> HttpResponse:
    request_data = validate_structure(request.data, ICreatePlanogram)

    store = Store.objects.filter(pk=request_data.store_id).first()
    if store is None:
        return error_json_response([f"Store with ID {request_data.store_id} not found"], status=404)

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
    import_result = planogram_import.import_planogram(planogram, request_data.planogram_text_dump)
    if not import_result.ok:
        return error_json_response(import_result.err, status=400)

    logger.info("Created planogram '%s' for store '%s'", planogram.name, store.name)

    return interfaces_response.IPlanogramCreated(
        planogram=planogram, num_products=import_result.value.num_products
    ).render(request)
