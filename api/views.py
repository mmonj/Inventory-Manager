import hashlib
import logging
from products import models
from products.util import get_current_work_cycle
from products.tasks import get_external_product_images
from .serializers import BarcodeSheetSerializer, StoreSerializer

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger('main_logger')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_api_token(request):
    """This route is used to check the validity of the client's API token without having to send any specific data.
    The presence of the @permission_classes decorator will assert the validity of the client's API token

    Returns:
        dict: Unimportant JSON response. The purpose of this route is to return
        a status code of 200 or 403 in the response
    """
    return Response({'message': 'Validated'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_store_product_additions(request):
    logger.info(
        f'Received client name "{request.data.get("client_name")}" for store "{request.data.get("store_name")}"')

    if not request.data.get("products"):
        logger.info("Received 0 products from request payload. Returning with default JSON response.")

        store, _ = models.Store.objects.select_related("field_representative").get_or_create(
            name=request.data["store_name"])
        return Response({
            "store": StoreSerializer(store).data
        })

    parent_company = get_object_or_404(models.BrandParentCompany, short_name=request.data.get('client_name'))

    sorted_upcs: list = update_product_names(request.data, parent_company)
    hash_object = hashlib.sha256()
    hash_object.update(str(sorted_upcs).encode())
    upcs_hash = hash_object.hexdigest()

    # initiate worker
    get_external_product_images.delay()

    store, _ = models.Store.objects.get_or_create(name=request.data['store_name'])
    product_additions = update_product_additions(store, request.data)

    current_work_cycle = get_current_work_cycle()
    barcode_sheet, is_new_barcode_sheet = models.BarcodeSheet.objects.prefetch_related(
        "store", "store__field_representative", "parent_company", "product_additions").get_or_create(
            store=store,
            parent_company=parent_company,
            upcs_hash=upcs_hash,
            work_cycle=current_work_cycle
        )

    if is_new_barcode_sheet:
        barcode_sheet.product_additions.add(*product_additions)

    resp_json = BarcodeSheetSerializer(
        barcode_sheet,
        context={
            'work_cycle': current_work_cycle
        }
    ).data

    logger.info(f"Returning JSON response with {len(resp_json['product_additions'])} product additions to client.")
    return Response(resp_json)


def update_product_names(request_json: dict, parent_company: models.BrandParentCompany) -> tuple:
    """Bulk create products if they don't already exist.
    Bulk update existing products with product name if they don't contain it

    Args:
        request_json (dict): request json payload received from client

    Returns:
        tuple: tuple<str> of sorted UPC numbers
    """
    def get_product_name(upc: str, products: list):
        for product_info in products:
            if product_info['upc'] == upc:
                return product_info['name']
        return None

    upcs = [p['upc'] for p in request_json.get('products')]

    # bulk create products
    new_products = []
    for product_info in request_json['products']:
        temp_product = models.Product(upc=product_info['upc'], name=product_info['name'], parent_company=parent_company)
        if not temp_product.is_valid_upc():
            logger.info(f'Invalid UPC {temp_product.upc}. Skipping')
            continue
        new_products.append(temp_product)

    logger.info(f'Bulk creating {len(new_products)} products')
    new_products = models.Product.objects.bulk_create(new_products, ignore_conflicts=True)

    # bulk update products with no name
    products = models.Product.objects.filter(upc__in=upcs, name=None)

    for product in products:
        product.parent_company = parent_company
        product.name = get_product_name(product.upc, request_json.get('products'))

    products.bulk_update(products, ['parent_company', 'name'])

    return sorted(upcs)


def update_product_additions(store: models.Store, request_json: dict) -> list:
    """Bulk create ProductAddition records if they don't already exist

    Args:
        store (products.models.Store): products.models.Store instance
        request_json (dict): request json payload received from client

    Returns:
        list: list of products.models.ProductAddition that match the UPCs present in request_json
    """
    upcs = [p['upc'] for p in request_json['products']]
    products = models.Product.objects.filter(upc__in=upcs)
    new_product_additions = []

    for product in products:
        temp_product_addition = models.ProductAddition(store=store, product=product)
        new_product_additions.append(temp_product_addition)

    logger.info(f'Bulk creating {len(new_product_additions)} product additions')
    models.ProductAddition.objects.bulk_create(new_product_additions, ignore_conflicts=True)

    return models.ProductAddition.objects.filter(store=store, product__upc__in=upcs).select_related("store", "product")
