import logging
from typing import TYPE_CHECKING

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from product_locator.views import templates

from .. import planogram_parser, util
from ..forms import PlanogramForm
from ..models import Planogram, ProductScanAudit, Store

if TYPE_CHECKING:
    from ..types import IImportedProductInfo

logger = logging.getLogger("main_logger")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def index(request: HttpRequest) -> HttpResponse:
    stores = Store.objects.all()
    planograms = Planogram.objects.all().select_related("store")

    return templates.ProductLocatorIndex(stores=list(stores), planograms=list(planograms)).render(
        request
    )


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def add_new_products(request: HttpRequest) -> HttpResponse:
    if request.method == "GET":
        stores = Store.objects.all()
        return templates.ProductLocatorAddNewProducts(
            form=PlanogramForm(), stores=list(stores)
        ).render(request)

    # if POST
    received_form = PlanogramForm(request.POST)
    if not received_form.is_valid():
        messages.error(request, "Invalid form submission.")
        stores = Store.objects.all()
        return templates.ProductLocatorAddNewProducts(
            form=received_form, stores=list(stores)
        ).render(request)

    planogram: Planogram = received_form.cleaned_data["planogram_pk"]
    planogram_text_dump: str = received_form.cleaned_data["planogram_text_dump"]
    is_reset_planogram: bool = received_form.cleaned_data["is_reset_planogram"]
    logger.info("is_reset_planogram: %s", is_reset_planogram)

    if not planogram_text_dump:
        messages.error(request, "You have submitted an empty planogram text dump.")
        stores = Store.objects.all()
        return templates.ProductLocatorAddNewProducts(
            form=received_form, stores=list(stores)
        ).render(request)

    product_list: list[IImportedProductInfo] = planogram_parser.parse_data(
        planogram_text_dump, request
    )
    logger.info("%s parsed from user input", len(product_list))

    if not product_list:
        messages.error(request, "You have submitted data that resulted in 0 items being parsed.")
        stores = Store.objects.all()
        return templates.ProductLocatorAddNewProducts(
            form=received_form, stores=list(stores)
        ).render(request)

    num_products_added, locations_that_are_updating = util.add_location_records(
        product_list, planogram, is_reset_planogram, request
    )

    if len(locations_that_are_updating) > 0:
        messages.warning(
            request,
            f"The following locations have changed: {', '.join(loc.name for loc in locations_that_are_updating)}",
        )

    if planogram.store is None:
        messages.error(request, "The selected planogram does not have an associated store.")
        stores = Store.objects.all()
        return templates.ProductLocatorAddNewProducts(
            form=received_form, stores=list(stores)
        ).render(request)

    messages.success(
        request,
        f"Submitted {num_products_added} out of {len(product_list)} items successfully to: Store '{planogram.store.name}', planogram '{planogram.name}'",
    )
    return redirect("product_locator:add_new_products")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scan_audit(request: HttpRequest) -> HttpResponse:
    scan_audits = (
        ProductScanAudit.objects.all()
        .prefetch_related("products_in_stock")
        .order_by("-datetime_created")
    )

    return templates.ProductLocatorScanAudit(previous_audits=list(scan_audits)).render(request)
