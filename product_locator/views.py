import json
import logging
from itertools import islice

from django import forms
from django.core.exceptions import ValidationError
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from . import models, serializers, planogram_parser

logger = logging.getLogger("main_logger")


class PlanogramModelForm(forms.Form):
    planogram_text_dump = forms.CharField(max_length=100000, widget=forms.Textarea)
    planogram_id = forms.ModelChoiceField(
        queryset=models.Planogram.objects.all().order_by("store__name").select_related("store"),
        empty_label="Select a planogram"
    )


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["GET"])
def index(request):
    stores = models.Store.objects.all()
    stores_ordered_dict = serializers.StoreSerializer(stores, many=True).data

    planograms = models.Planogram.objects.all().select_related("store")
    planograms = sorted(list(planograms), key=lambda p: p.store.name)

    return render(request, "product_locator/index.html", {
        "stores": json.dumps(stores_ordered_dict),
        "planograms": planograms
    })


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["GET", "POST"])
def add_new_products(request):
    if request.method == "GET":
        return render(request, "product_locator/add_new_products.html", {
            "planogram_form": PlanogramModelForm()
        })
    elif request.method == "POST":
        received_form = PlanogramModelForm(request.POST)
        if not received_form.is_valid():
            return render(request, "product_locator/add_new_products.html", {
                "planogram_form": received_form,
                "form_errors": received_form.errors
            })

        planogram: models.Planogram = received_form.cleaned_data["planogram_id"]
        planogram_text_dump = received_form.cleaned_data["planogram_text_dump"]
        product_list: list = planogram_parser.parse_data(planogram_text_dump)
        logger.info(f"{len(product_list)} parsed from user input")

        if not product_list:
            messages.error(request, "You have submitted data that resulted in 0 items being parsed.")
            return render(request, "product_locator/add_new_products.html", {
                "planogram_form": PlanogramModelForm(request.POST)
            }, status=500)

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
@permission_classes([IsAuthenticated])
def get_product_location(request):
    if request.method == "GET":
        upc = request.GET.get("upc")
        store_id = request.GET.get("store_id")

        try:
            product = models.Product.objects.prefetch_related("home_locations").get(upc=upc)
        except models.Product.DoesNotExist:
            return Response([], status=404)

        store = models.Store.objects.get(pk=store_id)
        home_locations = models.HomeLocation.objects.filter(planogram__store=store).filter(products__in=[product])

        resp_json = {
            "product": serializers.ProductSerializer(product).data,
            "home_locations": serializers.HomeLocationSerializer(home_locations, many=True).data
        }

        return Response(resp_json)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_new_product_location(request):
    try:
        product, _ = models.Product.objects.get_or_create(upc=request.data["upc"])
    except ValidationError:
        return Response({"message": "Invalid UPC"}, status=500)

    planogram = models.Planogram.objects.get(id=request.data["planogram_id"])
    location, is_new_location = models.HomeLocation.objects.select_related(
        "planogram").get_or_create(name=request.data["location"], planogram=planogram)

    if location not in product.home_locations.select_related("planogram", "planogram__store").all():
        logger.info(f"Adding location '{location}' to product '{product}'")
        product.home_locations.add(location)

    return Response(serializers.HomeLocationSerializer(location).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_planogram_locations(request):
    planogram_name = request.GET.get("planogram-name")
    store_name = request.GET.get("store-name")
    home_locations = models.HomeLocation.objects.prefetch_related("products").filter(
        planogram__name=planogram_name, planogram__store__name=store_name).all()

    home_locations_json = serializers.HomeLocation_Products_Serializer(home_locations, many=True).data

    return Response(home_locations_json)
