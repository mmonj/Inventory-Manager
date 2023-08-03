import logging
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response as DRFResponse

from products.models import ProductAddition
from .serializers import BasicProductAddition

from .types import ProductAdditionUncarryRequest, ProductAdditionsGETRequest

from api.util import validate_structure

logger = logging.getLogger("main_logger")


@api_view(["GET"])
def get_product_additions_by_store(request: DRFRequest) -> DRFResponse:
    request_data = validate_structure(request.GET, ProductAdditionsGETRequest)

    num_records_limit = 25

    product_additions = (
        ProductAddition.objects.prefetch_related("product", "product__parent_company")
        .filter(store__pk=request_data.store_id)
        .order_by("-id")
    )

    paginator = Paginator(product_additions, per_page=num_records_limit)
    page = paginator.get_page(request_data.page)
    logger.info(request_data.page)

    return DRFResponse(BasicProductAddition(list(page.object_list), many=True, read_only=True).data)


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
