import logging
from typing import TYPE_CHECKING, cast

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.urls import reverse_lazy
from django.views.decorators.http import require_http_methods

from product_locator.views import templates

from ..models import Planogram, PlanogramUpdate, ProductScanAudit, Store

if TYPE_CHECKING:
    from ..models import TPlanoTypeValue

logger = logging.getLogger("main_logger")


@require_http_methods(["GET"])
def index(request: HttpRequest) -> HttpResponse:
    return templates.ProductLocatorIndex().render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scanner(request: HttpRequest) -> HttpResponse:
    stores = Store.objects.all()
    planograms = Planogram.objects.all().select_related("store")

    return templates.ProductLocatorScanner(stores=list(stores), planograms=list(planograms)).render(
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
@require_http_methods(["GET"])
def manage_planograms(request: HttpRequest) -> HttpResponse:
    stores = Store.objects.all()
    plano_type_choices = [
        Planogram.TPlanoType(value=cast("TPlanoTypeValue", choice[0]), label=choice[1])
        for choice in Planogram.PlanoType.choices
    ]

    return templates.ProductLocatorManagePlanograms(
        stores=list(stores),
        plano_type_choices=plano_type_choices,
        default_plano_name=Planogram.DEFAULT_PLANO_NAME,
    ).render(request)
