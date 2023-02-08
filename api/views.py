from products import models
from products.util import get_current_work_cycle
from products.serializers import ProductAdditionSerializer, StoreSerializer

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_api_token(request):
    """This route is used to check the validity of the client's API token without having to send any specific data.
    The presence of the @permission_classes decorator will assert the validity of the client's API token

    Args:
        request (_type_): _description_

    Returns:
        dict: Unimportant JSON response. The purpose of this route is to return a 200 or 403 response
    """
    return Response({'message': 'Validated'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_store_product_additions(request):
    update_product_names(request.data)

    store, _ = models.Store.objects.get_or_create(name=request.data['store_name'])
    product_additions = update_product_additions(store, request.data)
    current_work_cycle = get_current_work_cycle()

    # set up response
    resp_json = {
        'store': StoreSerializer(store).data, 
        'product_additions': ProductAdditionSerializer(
            product_additions, 
            many=True, 
            context={'current_work_cycle': current_work_cycle}
        ).data
    }
    return Response(resp_json)


def update_product_names(request_json: dict):
    """Bulk create products if they don't already exist. Bulk update existing products with product name if they don't contain it

    Args:
        request_json (dict): request json payload received from client
    """
    def get_product_name(upc: str, products: list):
        for product_info in products:
            if product_info['upc'] == upc:
                return product_info['name']
        return None
    
    client_name = request_json.get('client_name')
    parent_company, _ = models.BrandParentCompany.objects.get_or_create(short_name=client_name)

    upcs = [p['upc'] for p in request_json.get('products')]

    # bulk create products
    new_products = []
    for product_info in request_json['products']:
        temp_product = models.Product(upc=product_info['upc'], name=product_info['name'], parent_company=parent_company)
        if temp_product.is_valid_upc():
            new_products.append(temp_product)
    new_products = models.Product.objects.bulk_create(new_products, ignore_conflicts=True)

    # bulk update products with no name
    products = models.Product.objects.filter(upc__in=upcs, name=None)

    for product in products:
        product.parent_company = parent_company
        product.name = get_product_name(product.upc, request_json.get('products'))
    
    products.bulk_update(products, ['parent_company', 'name'])


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

    product_addditions = models.ProductAddition.objects.bulk_create(new_product_additions, ignore_conflicts=True)

    return models.ProductAddition.objects.filter(store=store, product__upc__in=upcs)
