import logging

from django.core.exceptions import ValidationError
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DrfRequest

from product_locator import templates
from .forms import PlanogramForm

from . import models, serializers, planogram_parser, util

logger = logging.getLogger("main_logger")


@login_required(login_url=reverse_lazy("logger:login_view"))
@require_http_methods(["GET"])
def index(request: HttpRequest) -> HttpResponse:
    stores = models.Store.objects.all()
    planograms = models.Planogram.objects.all().select_related("store")

    return templates.ProductLocatorIndex(stores=list(stores), planograms=list(planograms)).render(
        request
    )


@login_required(login_url=reverse_lazy("logger:login_view"))
@require_http_methods(["GET", "POST"])
def add_new_products(request: HttpRequest) -> HttpResponse:
    if request.method == "GET":
        return templates.ProductLocatorAddNewProducts(form=PlanogramForm()).render(request)

    # if POST
    received_form = PlanogramForm(request.POST)
    if not received_form.is_valid():
        return templates.ProductLocatorAddNewProducts(form=received_form).render(request)

    planogram: models.Planogram = received_form.cleaned_data["planogram_pk"]
    planogram_text_dump = received_form.cleaned_data["planogram_text_dump"]
    product_list: list[dict[str, str]] = planogram_parser.parse_data(planogram_text_dump)
    logger.info(f"{len(product_list)} parsed from user input")

    if not product_list:
        messages.error(request, "You have submitted data that resulted in 0 items being parsed.")
        return render(
            request,
            "product_locator/add_new_products.html",
            {"planogram_form": PlanogramForm(request.POST)},
            status=500,
        )

    util.add_location_records(product_list, planogram)

    messages.success(request, f"Submitted {len(product_list)} items successfully")
    return redirect("product_locator:add_new_products")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_product_location(request: DrfRequest) -> Response:
    upc = request.GET.get("upc")
    store_id = request.GET.get("store_id")
    if store_id is None:
        raise Exception("No store id given in url params")

    try:
        product = models.Product.objects.prefetch_related("home_locations").get(upc=upc)
    except models.Product.DoesNotExist:
        return Response([], status=404)

    store = models.Store.objects.get(pk=store_id)
    home_locations = models.HomeLocation.objects.filter(planogram__store=store).filter(
        products__in=[product]
    )

    resp_json = {
        "product": serializers.ProductSerializer(product).data,
        "home_locations": serializers.HomeLocationSerializer(home_locations, many=True).data,
    }

    return Response(resp_json)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_new_product_location(request: DrfRequest) -> HttpResponse:
    try:
        product, _ = models.Product.objects.get_or_create(upc=request.data["upc"])
    except ValidationError:
        return Response({"message": "Invalid UPC"}, status=500)

    planogram = models.Planogram.objects.get(id=request.data["planogram_id"])
    location, is_new_location = models.HomeLocation.objects.select_related(
        "planogram"
    ).get_or_create(name=request.data["location"], planogram=planogram)

    if location not in product.home_locations.select_related("planogram", "planogram__store").all():
        logger.info(f"Adding location '{location}' to product '{product}'")
        product.home_locations.add(location)

    return Response(serializers.HomeLocationSerializer(location).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_planogram_locations(request: HttpRequest) -> HttpResponse:
    planogram_name = request.GET.get("planogram-name")
    store_name = request.GET.get("store-name")
    home_locations = (
        models.HomeLocation.objects.prefetch_related("products")
        .filter(planogram__name=planogram_name, planogram__store__name=store_name)
        .all()
    )

    home_locations_json = serializers.HomeLocation_Products_Serializer(
        home_locations, many=True
    ).data

    return Response(home_locations_json)
