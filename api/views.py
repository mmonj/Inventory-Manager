from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from products import models
from products.serializers import ProductAdditionSerializer
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_product_names(request):
    def get_product_name(upc: str, products: list):
        for product_info in products:
            if product_info['upc'] == upc:
                return product_info['name']
        return None
    
    store_name = request.data.get('store_name')
    client_name = request.data.get('client_name')
    upcs = [p['upc'] for p in request.data.get('products')]

    # products with no name
    products = models.Product.objects.filter(upc__in=upcs, name=None)
    parent_company, _ = models.BrandParentCompany.objects.get_or_create(short_name=client_name)

    for product in products:
        product.parent_company = parent_company
        product.name = get_product_name(product.upc, request.data.get('products'))
    
    products.bulk_update(products, ['parent_company', 'name'])
        

    product_additions = models.ProductAddition.objects.filter(store__name=store_name, is_carried=True, product__upc__in=upcs)
    product_additions_serializer = ProductAdditionSerializer(product_additions, many=True)
    return Response(product_additions_serializer.data)
