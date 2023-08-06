import logging

from django.core.exceptions import ValidationError
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch
from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound, ValidationError as DrfValidationError
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DRFRequest

from .types import GetProductLocationRequest
from api.util import validate_structure

from product_locator import templates
from .forms import PlanogramForm

from . import planogram_parser, util
from .models import Product, Store, Planogram, HomeLocation
from .serializers import (
    HomeLocationSerializer,
    ProductWithHomeLocationsSerializer,
    HomeLocation_Products_Serializer,
)

logger = logging.getLogger("main_logger")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def index(request: DRFRequest) -> HttpResponse:
    stores = Store.objects.all()
    planograms = Planogram.objects.all().select_related("store")

    return templates.ProductLocatorIndex(stores=list(stores), planograms=list(planograms)).render(
        request
    )


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def add_new_products(request: DRFRequest) -> HttpResponse:
    if request.method == "GET":
        return templates.ProductLocatorAddNewProducts(form=PlanogramForm()).render(request)

    # if POST
    received_form = PlanogramForm(request.POST)
    if not received_form.is_valid():
        return templates.ProductLocatorAddNewProducts(form=received_form).render(request)

    planogram: Planogram = received_form.cleaned_data["planogram_pk"]
    planogram_text_dump = received_form.cleaned_data["planogram_text_dump"]
    product_list: list[dict[str, str]] = planogram_parser.parse_data(planogram_text_dump)
    logger.info(f"{len(product_list)} parsed from user input")

    if not product_list:
        messages.error(request, "You have submitted data that resulted in 0 items being parsed.")
        return templates.ProductLocatorAddNewProducts(form=received_form).render(request)

    util.add_location_records(product_list, planogram)

    messages.success(request, f"Submitted {len(product_list)} items successfully")
    return redirect("product_locator:add_new_products")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_product_location(request: DRFRequest) -> Response:
    request_data = validate_structure(request.GET, GetProductLocationRequest)
    try:
        Product(upc=request_data.upc).clean()
    except ValidationError as ex:
        raise DrfValidationError(ex.messages)

    product = (
        Product.objects.prefetch_related(
            Prefetch(
                "home_locations",
                queryset=HomeLocation.objects.filter(planogram__store__pk=request_data.store_id),
            ),
        )
        .filter(upc=request_data.upc)
        .first()
    )

    if product is None:
        raise DrfNotFound(f"Product with UPC {request_data.upc} not found")

    return Response(ProductWithHomeLocationsSerializer(product).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_new_product_location(request: DRFRequest) -> HttpResponse:
    try:
        product, _ = Product.objects.get_or_create(upc=request.data["upc"])
    except ValidationError:
        return Response({"message": "Invalid UPC"}, status=500)

    planogram = Planogram.objects.get(id=request.data["planogram_id"])
    location, is_new_location = HomeLocation.objects.select_related("planogram").get_or_create(
        name=request.data["location"], planogram=planogram
    )

    if location not in product.home_locations.select_related("planogram", "planogram__store").all():
        logger.info(f"Adding location '{location}' to product '{product}'")
        product.home_locations.add(location)

    return Response(HomeLocationSerializer(location).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_planogram_locations(request: DRFRequest) -> HttpResponse:
    planogram_name = request.GET.get("planogram-name")
    store_name = request.GET.get("store-name")
    home_locations = (
        HomeLocation.objects.prefetch_related("products")
        .filter(planogram__name=planogram_name, planogram__store__name=store_name)
        .all()
    )

    home_locations_json = HomeLocation_Products_Serializer(home_locations, many=True).data

    return Response(home_locations_json)
