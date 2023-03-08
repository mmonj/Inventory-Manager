import json
import logging

from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from . import models, serializers

logger = logging.getLogger("main_logger")


def index(request):
    stores = models.Store.objects.all()
    stores_json = serializers.StoreSerializer(stores, many=True).data
    stores_json = json.dumps(stores_json)

    return render(request, "product_locator/index.html", {
        "stores": stores_json,
    })


@api_view(["GET"])
def get_product_location(request):
    if request.method == "GET":
        store = models.Store.objects.get(id=request.GET.get("store_id"))
        upc = request.GET.get("upc")

        try:
            product = models.Product.objects.get(upc=upc)
        except models.Product.DoesNotExist:
            return Response([], status=404)

        home_locations = models.HomeLocation.objects.filter(planogram__store=store, products__in=[product])
        resp_json = serializers.HomeLocationSerializer(home_locations, many=True).data

        return Response(resp_json)
