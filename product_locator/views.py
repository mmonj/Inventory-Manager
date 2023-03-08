import json
import logging

from django.shortcuts import render
from . import models, serializers

logger = logging.getLogger("main_logger")


def index(request):
    stores = models.Store.objects.all()
    stores_json = serializers.StoreSerializer(stores, many=True).data
    stores_json = json.dumps(stores_json)

    return render(request, "product_locator/index.html", {
        "stores": stores_json,
    })


def add_product_location(request):
    if request.method == "POST":
        pass
