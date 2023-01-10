from rest_framework.decorators import api_view
from rest_framework.response import Response

from products import models
from products.serializers import ProductSerializer

@api_view(['POST'])
def test(request, *args, **kwargs):
    """
    DRF API View
    """

    product = models.Product.objects.first()
    serialized_product = ProductSerializer(product)
    return Response(serialized_product.data)

    # serializer = ProductSerializer(data=request.data)
    # if serializer.is_valid(raise_exception=True):
    #     # instance = serializer.save()
    #     # instance = form.save()
    #     print(serializer.data)
    #     return Response(serializer.data)
    return Response({"invalid": "not good data"}, status=400)