import hashlib
import logging
from typing import List, Optional

from django.http import HttpRequest, HttpResponse
from django_stubs_ext import QuerySetAny
from .types import GetStoreAdditionsInterface, ProductInterface, UpdateStoreFieldRepInterface
from products.models import (
    Store,
    FieldRepresentative,
    BrandParentCompany,
    ProductAddition,
    Product,
    BarcodeSheet,
    StoreGUID,
)
from products.util import get_current_work_cycle
from products.tasks import get_external_product_images
from .serializers import BarcodeSheetSerializer, StoreSerializer, FieldRepresentativeSerializer

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger("main_logger")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def validate_api_token(request: HttpRequest) -> HttpResponse:
    """This route is used to check the validity of the client's API token without having to send any specific data.
    The presence of the @permission_classes decorator will assert the validity of the client's API token

    Returns:
        dict: Unimportant JSON response. The purpose of this route is to return
        a status code of 200 or 403 in the response
    """
    return Response({"message": "Validated"})


# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def get_field_rep_info(request: HttpRequest) -> HttpResponse:
#     store_name = request.GET.get("store_name")
#     store, _ = Store.objects.select_related("field_representative").get_or_create(name=store_name)

#     resp_json = StoreSerializer(store).data
#     return Response(resp_json)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_field_reps(request: HttpRequest) -> HttpResponse:
    field_reps = FieldRepresentative.objects.all()
    resp_json = FieldRepresentativeSerializer(field_reps, many=True).data

    return Response(resp_json)


@api_view(["GET"])
def get_matching_stores(request: HttpRequest) -> HttpResponse:
    received_store_name = request.GET.get("store-name")
    received_partial_store_address = request.GET.get("partial-store-address")
    # possible store GUID. The GUID indicated may or may not be unique per store,
    # but it will be stored for historical purposes
    received_store_guid = request.GET.get("store-guid")

    if received_store_name is None or received_store_guid is None:
        return Response({"message": "Missing search query params"}, status=500)
    if "" in [received_store_name, received_partial_store_address, received_store_guid]:
        return Response(
            {"message": "Received search query params with no value (empty string)"}, status=500
        )

    logger.info(
        f"Received data store_name '{received_store_name}', "
        f"partial store address '{received_partial_store_address}', store guid '{received_store_guid}'"
    )

    stores_queryset: QuerySetAny[Store, Store]

    if received_partial_store_address is None:
        logger.info("Getting store by exact store name")
        stores_queryset = Store.objects.filter(name=received_store_name).prefetch_related(
            "field_representative", "store_guids"
        )
    else:
        logger.info("Getting store by partial store address")
        stores_queryset = Store.objects.filter(
            name__icontains=received_partial_store_address
        ).prefetch_related("field_representative", "store_guids")

    stores_list: List[Store] = []

    if not stores_queryset:
        logger.info("No store match found. Creating new store record")
        new_store: Store = Store.objects.create(name=received_store_name)
        store_guid, is_new_guid = StoreGUID.objects.get_or_create(value=received_store_guid)
        new_store.store_guids.add(store_guid)
        stores_list = [new_store]
    elif stores_queryset.count() > 0:
        logger.info("At least one store record retrieved. Returning first record in queryset")
        first_store: Optional[Store] = stores_queryset.first()
        if first_store:
            store_guid, is_new_guid = StoreGUID.objects.get_or_create(value=received_store_guid)
            first_store.store_guids.add(store_guid)
            stores_list = [first_store]

    if stores_queryset.count() > 1:
        logger.info(
            f"A total of {stores_queryset.count()} stores matched partial store address"
            f": '{received_partial_store_address}'. Full store name from request data: '{received_store_name}'"
        )

    return Response(StoreSerializer(stores_list, many=True).data)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_store_field_rep(request: HttpRequest) -> HttpResponse:
    request_data: UpdateStoreFieldRepInterface = request.data  # type: ignore[attr-defined]
    store_id = request_data.get("store_id")
    new_field_rep_id = request_data.get("new_field_rep_id")

    if store_id is None or new_field_rep_id is None:
        return Response({"message": "Missing attributes"}, 500)

    store = Store.objects.get(id=store_id)
    new_field_rep = FieldRepresentative.objects.get(id=new_field_rep_id)
    store.field_representative = new_field_rep
    store.save(update_fields=["field_representative"])

    resp_data = StoreSerializer(store).data
    return Response(resp_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_store_product_additions(request: HttpRequest) -> HttpResponse:
    request_data: GetStoreAdditionsInterface = request.data  # type: ignore [attr-defined]
    logger.info(
        f'Received client name "{request_data.get("client_name")}" for store "{request_data.get("store_name")}"'
    )

    if not request_data.get("products"):
        logger.info(
            "Received 0 products from request payload. Returning with default JSON response."
        )

        store = Store.objects.select_related("field_representative").get(
            pk=request_data["store_id"]
        )
        return Response({"store": StoreSerializer(store).data})

    parent_company = get_object_or_404(
        BrandParentCompany, short_name=request_data.get("client_name")
    )

    sorted_upcs: List[str] = update_product_names(request_data, parent_company)
    hash_object = hashlib.sha256()
    hash_object.update(str(sorted_upcs).encode())
    upcs_hash = hash_object.hexdigest()

    # initiate worker
    get_external_product_images.delay()

    store = Store.objects.get(pk=request_data["store_id"])
    product_additions = update_product_additions(store, request_data)
    current_work_cycle = get_current_work_cycle()
    barcode_sheet, is_new_barcode_sheet = BarcodeSheet.objects.prefetch_related(
        "store", "store__field_representative", "parent_company", "product_additions"
    ).get_or_create(
        store=store,
        parent_company=parent_company,
        upcs_hash=upcs_hash,
        work_cycle=current_work_cycle,
    )

    if is_new_barcode_sheet:
        barcode_sheet.product_additions.add(*product_additions)

    resp_json = BarcodeSheetSerializer(
        barcode_sheet, context={"work_cycle": current_work_cycle}
    ).data

    logger.info(
        f"Returning JSON response with {len(resp_json['product_additions'])} product additions to client."
    )
    return Response(resp_json)


def update_product_names(
    request_data: GetStoreAdditionsInterface, parent_company: BrandParentCompany
) -> List[str]:
    """Bulk create products if they don't already exist.
    Bulk update existing products with product name if they don't contain it

    Args:
        request_json (dict): request json payload received from client

    Returns:
        tuple: tuple<str> of sorted UPC numbers
    """

    def get_product_name(upc: str, products: List[ProductInterface]) -> Optional[str]:
        for product_info in products:
            if product_info["upc"] == upc:
                return product_info["name"]
        return None

    upcs = [p["upc"] for p in request_data["products"]]

    # bulk create products
    new_products = []
    for product_info in request_data["products"]:
        temp_product = Product(
            upc=product_info["upc"], name=product_info["name"], parent_company=parent_company
        )
        if not temp_product.is_valid_upc():
            logger.info(f"Invalid UPC {temp_product.upc}. Skipping")
            continue
        new_products.append(temp_product)

    logger.info(f"Bulk creating {len(new_products)} products")
    new_products = Product.objects.bulk_create(new_products, ignore_conflicts=True)

    # bulk update products with no name
    products = Product.objects.filter(upc__in=upcs, name=None)

    for product in products:
        product.parent_company = parent_company
        product.name = get_product_name(product.upc, request_data["products"])

    products.bulk_update(products, ["parent_company", "name"])

    return sorted(upcs)


def update_product_additions(
    store: Store, request_data: GetStoreAdditionsInterface
) -> List[ProductAddition]:
    """Bulk create ProductAddition records if they don't already exist

    Args:
        store (products.Store): products.Store instance
        request_json (dict): request json payload received from client

    Returns:
        list: list of products.ProductAddition that match the UPCs present in request_json
    """
    upcs = [p["upc"] for p in request_data["products"]]
    products = Product.objects.filter(upc__in=upcs)
    new_product_additions = []

    for product in products:
        temp_product_addition = ProductAddition(store=store, product=product)
        new_product_additions.append(temp_product_addition)

    logger.info(f"Bulk creating {len(new_product_additions)} product additions")
    ProductAddition.objects.bulk_create(new_product_additions, ignore_conflicts=True)

    return list(
        ProductAddition.objects.filter(store=store, product__upc__in=upcs).select_related(
            "store", "product"
        )
    )
