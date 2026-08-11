import logging
from typing import TYPE_CHECKING, cast

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from product_locator.views import templates

from ..forms import CreatePlanogramForm
from ..models import Planogram, PlanogramUpdate, ProductScanAudit, Store

if TYPE_CHECKING:
    from ..models import TPlanoTypeValue

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
@require_http_methods(["GET"])
def planogram_updates(request: HttpRequest) -> HttpResponse:
    updates = (
        PlanogramUpdate.objects.all()
        .select_related("planogram", "planogram__store")
        .order_by("is_applied", "-datetime_created")
    )

    return templates.ProductLocatorPlanogramUpdates(
        planogram_updates=[
            templates.TPlanogramUpdate(
                pk=update.pk,
                label=update.label,
                is_applied=update.is_applied,
                old_plano=update.old_plano,
                new_plano=update.new_plano,
                planogram=update.planogram,
            )
            for update in updates
        ]
    ).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scan_audit(request: HttpRequest) -> HttpResponse:
    scan_audits = (
        ProductScanAudit.objects.all()
        .prefetch_related("products_in_stock")
        .order_by("-datetime_created")
    )

    return templates.ProductLocatorScanAudit(previous_audits=list(scan_audits)).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def manage_planograms(request: HttpRequest) -> HttpResponse:
    stores = Store.objects.all()
    plano_type_choices = [
        Planogram.TPlanoType(value=cast("TPlanoTypeValue", choice[0]), label=choice[1])
        for choice in Planogram.PlanoType.choices
    ]

    if request.method == "GET":
        return templates.ProductLocatorManagePlanograms(
            stores=list(stores),
            plano_type_choices=plano_type_choices,
            default_plano_name=Planogram.DEFAULT_PLANO_NAME,
        ).render(request)

    # POST request
    received_form = CreatePlanogramForm(request.POST)
    if not received_form.is_valid():
        messages.error(request, "Invalid form submission.")
        return templates.ProductLocatorManagePlanograms(
            stores=list(stores),
            plano_type_choices=plano_type_choices,
            default_plano_name=Planogram.DEFAULT_PLANO_NAME,
        ).render(request)

    # save new planogram
    new_planogram = received_form.save()
    # CreatePlanogramForm marks `store` as required=True, so it's always set after a valid save
    if new_planogram.store is None:
        raise ValueError("Newly-created planogram unexpectedly has no associated store")
    messages.success(
        request,
        f"Successfully created planogram '{new_planogram.name}' for store '{new_planogram.store.name}'.",
    )
    return redirect("product_locator:manage_planograms")
