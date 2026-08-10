import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response as DRFResponse

from products.models import BarcodeSheet, Product, ProductAddition, Store
from server.utils.common import get_pagination_data, validate_structure
from stock_tracker import util

from .interfaces_request import (
    BarcodeSheetsGETRequest,
    LogProductScanRequest,
    ProductAdditionsGETRequest,
    ProductAdditionUncarryRequest,
)
from .interfaces_response import BasicBarcodeSheet, BasicProductAddition

logger = logging.getLogger("main_logger")


@api_view(["GET"])
def get_product_additions_by_store(request: DRFRequest) -> DRFResponse:
    request_data = validate_structure(request.GET, ProductAdditionsGETRequest)

    num_records_limit = 25

    product_additions = (
        ProductAddition.objects.prefetch_related("product", "product__parent_company")
        .filter(store__pk=request_data.store_id, is_carried=True)
        .order_by("-date_last_scanned", "-id")
    )

    if request_data.product_name != "":
        product_additions = product_additions.filter(
            product__name__icontains=request_data.product_name
        )

    if request_data.brand_parent_company_ids != "":
        brand_parent_company_ids = [
            int(pk) for pk in request_data.brand_parent_company_ids.split(",") if pk
        ]
        product_additions = product_additions.filter(
            product__parent_company__pk__in=brand_parent_company_ids
        )

    pagination_result = get_pagination_data(
        product_additions, page=request_data.page, page_size=num_records_limit
    )
    if not pagination_result.ok:
        raise DRFValidationError(str(pagination_result.err))

    page_obj, _ = pagination_result.value
    logger.info(request_data.page)

    return DRFResponse(
        BasicProductAddition(list(page_obj.object_list), many=True, read_only=True).data
    )


@api_view(["GET"])
def get_barcode_sheets(request: DRFRequest) -> DRFResponse:
    request_data = validate_structure(request.GET, BarcodeSheetsGETRequest)

    num_records_limit = 25

    barcode_sheets = BarcodeSheet.objects.prefetch_related(
        "store", "parent_company", "work_cycle", "product_additions"
    ).order_by("-id")

    if request_data.field_representative_id != "":
        barcode_sheets = barcode_sheets.filter(
            store__field_representative=int(request_data.field_representative_id)
        )

    pagination_result = get_pagination_data(
        barcode_sheets, page=request_data.page, page_size=num_records_limit
    )
    if not pagination_result.ok:
        raise DRFValidationError(str(pagination_result.err))

    page_obj, _ = pagination_result.value

    return DRFResponse(
        BasicBarcodeSheet(list(page_obj.object_list), many=True, read_only=True).data
    )


@api_view(["POST"])
def log_product_scan(request: DRFRequest) -> DRFResponse:
    request_data = validate_structure(request.data, LogProductScanRequest)
    try:
        product, _ = Product.objects.get_or_create(upc=request_data.upc)
    except DjangoValidationError as ex:
        raise DRFValidationError(ex.messages) from ex

    store = Store.objects.get(pk=request_data.store_id)
    product_addition, _ = ProductAddition.objects.get_or_create(product=product, store=store)

    util.record_product_addition(product_addition, is_product_scanned=True)
    logger.info(
        "Set product addition record (carry) for '%s' for store '%s'", product.upc, store.name
    )

    return DRFResponse(BasicProductAddition(product_addition).data)


@api_view(["PUT"])
def uncarry_product_addition_by_id(request: DRFRequest) -> DRFResponse:
    request_data = validate_structure(request.data, ProductAdditionUncarryRequest)

    product_addition = get_object_or_404(
        ProductAddition.objects.prefetch_related("product", "product__parent_company").filter(
            id=request_data.product_addition_id
        )
    )
    product_addition.is_carried = False
    product_addition.save(update_fields=["is_carried"])

    return DRFResponse(BasicProductAddition(product_addition).data)
