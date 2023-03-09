import json
import logging
from itertools import islice

from django.core.exceptions import ValidationError
from django.contrib import messages
from django import forms
from django.shortcuts import render, redirect
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import models, serializers, planogram_parser

logger = logging.getLogger("main_logger")


class PlanogramModelForm(forms.Form):
    planogram_text_dump = forms.CharField(max_length=100000, widget=forms.Textarea)
    planogram_id = forms.ModelChoiceField(
        queryset=models.Planogram.objects.all().order_by("store__name").select_related("store"),
        empty_label="Select a store"
        )


def index(request):
    stores = models.Store.objects.all()
    stores_json = serializers.StoreSerializer(stores, many=True).data
    stores_json = json.dumps(stores_json)

    return render(request, "product_locator/index.html", {
        "stores": stores_json,
    })


def add_new_products(request):
    if request.method == "GET":
        return render(request, "product_locator/add_new_products.html", {
            "planogram_form": PlanogramModelForm()
        })
    elif request.method == "POST":
        received_form = PlanogramModelForm(request.POST)
        if not received_form.is_valid():
            return render(request, "product_locator/add_new_products.html", {
                "planogram_form": received_form
            })

        planogram: models.Planogram = received_form.cleaned_data["planogram_id"]
        planogram_text_dump = received_form.cleaned_data["planogram_text_dump"]
        product_list: list = planogram_parser.parse_data(planogram_text_dump)

        if not product_list:
            messages.error(request, "You have submitted data that resulted in 0 items being parsed.")
            return render(request, "product_locator/add_new_products.html", {
                "planogram_form": PlanogramModelForm(request.POST)
            })

        add_location_records(product_list, planogram)

        messages.success(request, f"Submitted {len(product_list)} items successfully")
        return redirect("product_locator:add_new_products")


def add_location_records(product_list: dict, planogram: models.Planogram):
    new_locations = []

    for product_data in product_list:
        new_locations.append(models.HomeLocation(name=product_data["location"], planogram=planogram))

    logger.info(f"Bulk creating {len(new_locations)} new locations")
    bulk_create_in_batches(models.HomeLocation, iter(new_locations), ignore_conflicts=True)
    home_locations = models.HomeLocation.objects.filter(planogram=planogram)
    home_locations = {loc.name: loc for loc in home_locations}

    for product_data in product_list:
        try:
            product, _ = models.Product.objects.get_or_create(upc=product_data["upc"], name=product_data["name"])
            home_location = home_locations.get(product_data["location"])
            product.home_locations.add(home_location)
        except ValidationError as e:
            logger.error(f"Validation error for UPC: {[product_data['upc']]} - {product_data['name']} - {e}")
            continue


def bulk_create_in_batches(TargetModelClass, objs: iter, batch_size=100, ignore_conflicts=False):
    while True:
        batch = list(islice(objs, batch_size))
        if not batch:
            break
        TargetModelClass.objects.bulk_create(batch, batch_size, ignore_conflicts=ignore_conflicts)


@api_view(["GET"])
def get_product_location(request):
    if request.method == "GET":
        upc = request.GET.get("upc")

        try:
            product = models.Product.objects.prefetch_related("home_locations").get(upc=upc)
        except models.Product.DoesNotExist:
            return Response([], status=404)

        resp_json = serializers.ProductSerializer(product).data

        return Response(resp_json)
