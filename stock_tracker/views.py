import logging

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseNotFound,
    HttpResponseRedirect,
    HttpResponseServerError,
    JsonResponse,
)
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.encoding import iri_to_uri
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_http_methods

from products.models import (
    BarcodeSheet,
    BrandParentCompany,
    FieldRepresentative,
    PersonnelContact,
    ProductAddition,
    Store,
)
from products.util import import_new_stores
from server.utils.common import validate_structure

from . import forms, serializers, templates, util
from .types import BarcodeSheetInterface, SheetTypeDescriptionInterface

logger = logging.getLogger("main_logger")


@require_http_methods(["GET"])
def index(request: HttpRequest) -> HttpResponse:
    return templates.StockTrackerIndex().render(request)


@require_http_methods(["GET", "POST"])
def login_view(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        logger.info(
            "User %s is already logged in. Redirecting to homepage index",
            request.user.get_username(),
        )
        return redirect("root:index")

    if request.method == "GET":
        return templates.StockTrackerLogin(is_invalid_credentials=False).render(request)
    # Attempt to sign user in
    username = request.POST["username"]
    password = request.POST["password"]
    user = authenticate(request, username=username, password=password)

    # Check if authentication successful
    if user is not None:
        login(request, user)

        next_url = iri_to_uri(request.POST.get("next", "/"))
        if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts=None):
            return redirect(next_url)

        return redirect("root:index")
    return templates.StockTrackerLogin(is_invalid_credentials=True).render(request)


@require_http_methods(["GET"])
def logout_view(request: HttpRequest) -> HttpResponse:
    logout(request)
    return redirect("stock_tracker:login_view")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scanner(request: HttpRequest) -> HttpResponse:
    field_reps = FieldRepresentative.objects.prefetch_related("stores").all()

    return templates.StockTrackerScanner(field_reps=list(field_reps)).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def add_new_stores(request: HttpRequest) -> HttpResponse:
    if request.method == "GET":
        return templates.StockTrackerAddNewStores(form=forms.NewStoresForm()).render(request)

    received_form = forms.NewStoresForm(request.POST)
    if not received_form.is_valid():
        return templates.StockTrackerAddNewStores(form=received_form).render(request)

    new_stores_from_post: str = received_form.cleaned_data["stores_text"]
    new_stores = [s for s in (f.strip() for f in new_stores_from_post.split("\n")) if s]
    logger.info(
        "Adding new stores from user input. %d possible new stores submitted.", len(new_stores)
    )
    import_new_stores(new_stores)

    messages.success(request, "Your submission was successful")
    return redirect("stock_tracker:add_new_stores")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scan_history(request: HttpRequest) -> HttpResponse:
    field_reps = FieldRepresentative.objects.prefetch_related("stores").all()
    brand_parent_companies = BrandParentCompany.objects.order_by("expanded_name", "short_name")
    return templates.StockTrackerScanHistory(
        field_reps=list(field_reps), brand_parent_companies=list(brand_parent_companies)
    ).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def uncarry_product_addition(
    request: HttpRequest,  # noqa: ARG001 -- required by Django view signature
    product_addition_pk: int,
) -> HttpResponse:
    product_addition = ProductAddition.objects.get(pk=product_addition_pk)
    product_addition.is_carried = False
    product_addition.save(update_fields=["is_carried"])

    return JsonResponse({"message": "success"})


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def barcode_sheet_history(
    request: HttpRequest, field_representative_id: int | None = None
) -> HttpResponse:
    fields_to_prefetch = ["store", "parent_company", "product_additions", "work_cycle"]
    num_fields = 25

    field_representatives = FieldRepresentative.objects.all()
    if field_representative_id is None:
        recent_barcode_sheets = (
            BarcodeSheet.objects.all()
            .order_by("-id")
            .prefetch_related(*fields_to_prefetch)[:num_fields]
        )
    else:
        recent_barcode_sheets = (
            BarcodeSheet.objects.filter(store__field_representative=field_representative_id)
            .order_by("-id")
            .prefetch_related(*fields_to_prefetch)[:num_fields]
        )

    return templates.StockTrackerBarcodeSheetsHistory(
        current_field_rep_id=field_representative_id,
        field_representatives=list(field_representatives),
        recent_barcode_sheets=list(recent_barcode_sheets),
    ).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def get_barcode_sheet(request: HttpRequest, barcode_sheet_id: int) -> HttpResponse:
    # Check sheet_type validity
    sheet_type: str = request.GET.get("sheet-type", "")
    possible_sheet_types_info: list[SheetTypeDescriptionInterface] = [
        {
            "sheetType": "all-products",
            "sheetTypeVerbose": "All Products",
        },
        {
            "sheetType": "out-of-dist",
            "sheetTypeVerbose": "Out Of Distribution",
        },
        {
            "sheetType": "in-dist",
            "sheetTypeVerbose": "In Distribution",
        },
    ]

    result_sheet_type_info = util.get_sheet_type_info(sheet_type, possible_sheet_types_info)
    if result_sheet_type_info is None:
        return HttpResponseNotFound()

    # get barcode sheet
    sheet_query_info = util.get_sheet_query_info(sheet_type)
    if sheet_query_info is None:
        return HttpResponseNotFound()

    barcode_sheet = get_object_or_404(
        BarcodeSheet.objects.prefetch_related(
            "store",
            "parent_company",
            "product_additions",
            "product_additions__product",
        ),
        id=barcode_sheet_id,
    )

    barcode_sheet_data = validate_structure(
        serializers.BarcodeSheetSerializer(
            barcode_sheet, context={"work_cycle": barcode_sheet.work_cycle}
        ).data,
        BarcodeSheetInterface,
    )

    upcs_list = barcode_sheet.upcs_list
    if upcs_list is not None:
        barcode_sheet_data["product_additions"] = sorted(
            barcode_sheet_data["product_additions"],
            key=lambda product_addition: upcs_list.index(product_addition["product"]["upc"]),
        )

    num_products = len(barcode_sheet_data["product_additions"])
    barcode_sheet_data["product_additions"] = [
        p
        for p in barcode_sheet_data["product_additions"]
        if p["is_carried"] in sheet_query_info["is_carried_list"]
    ]

    logger.info(
        "Serving Barcode Sheet. Client: '%s' - Store: '%s'",
        barcode_sheet.parent_company,
        barcode_sheet.store.name,
    )

    return templates.StockTrackerBarcodeSheet(
        barcodeSheet=barcode_sheet_data,
        total_products=num_products,
        sheetTypeInfo=result_sheet_type_info,
        possibleSheetTypesInfo=possible_sheet_types_info,
    ).render(request)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def get_manager_names(request: HttpRequest) -> HttpResponse:
    if request.method == "GET":
        field_reps = FieldRepresentative.objects.prefetch_related(
            "stores", "stores__contacts"
        ).all()

        return templates.StocktrackerStoreManagerNames(field_reps=list(field_reps)).render(request)

    # if POST
    #
    # if user has chosen to update existing contact names
    if "contact-id" in request.POST:
        with transaction.atomic():
            personnel_contacts = PersonnelContact.objects.select_for_update().in_bulk(
                request.POST.getlist("contact-id")
            )

            updated_contacts = []
            for contact_id, first_name, last_name in zip(
                request.POST.getlist("contact-id"),
                request.POST.getlist("contact-first-name"),
                request.POST.getlist("contact-last-name"),
                strict=True,
            ):
                existing_contact = personnel_contacts[int(contact_id)]
                if (first_name, last_name) != (
                    existing_contact.first_name,
                    existing_contact.last_name,
                ):
                    existing_contact.first_name = first_name
                    existing_contact.last_name = last_name
                    updated_contacts.append(existing_contact)

            PersonnelContact.objects.bulk_update(updated_contacts, ["first_name", "last_name"])

    # indicates if user has chosen to add a new contact to a store that previously had none
    if "store-id" in request.POST:
        with transaction.atomic():
            new_contacts = []
            stores = Store.objects.select_for_update().in_bulk(request.POST.getlist("store-id"))

            for store_id, first_name, last_name in zip(
                request.POST.getlist("store-id"),
                request.POST.getlist("new-contact-first-name"),
                request.POST.getlist("new-contact-last-name"),
                strict=True,
            ):
                personnel_contact = PersonnelContact(
                    first_name=first_name, last_name=last_name, store=stores[int(store_id)]
                )
                new_contacts.append(personnel_contact)

            PersonnelContact.objects.bulk_create(new_contacts)

    messages.success(request, "Submitted contact names successfully")
    return redirect("stock_tracker:get_manager_names")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def set_product_distribution_order_status(request: HttpRequest) -> HttpResponse:
    product_id_list = request.POST.getlist("product-addition-id")
    product_additions = ProductAddition.objects.filter(id__in=product_id_list)
    for product_addition in product_additions:
        product_addition.date_ordered = timezone.now()
        product_addition.save(update_fields=["date_ordered"])

    logger.info("Marked Product Addition IDs %s as ordered", ", ".join(product_id_list))

    messages.success(request, f"Submitted {len(product_id_list)} item(s) as ordered")
    return HttpResponseRedirect(request.META["HTTP_REFERER"])


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def set_carried_product_additions(request: HttpRequest) -> HttpResponse:
    redirect_route: str | None = request.META.get("HTTP_REFERER")
    if redirect_route is None:
        return HttpResponseServerError()

    product_id_list = request.POST.getlist("product-addition-id")
    if not product_id_list:
        logger.info("Barcode sheet form returned 0 new products. Redirecting with error message")
        messages.error(request, "Error. Received 0 new products to update")
        return HttpResponseRedirect(redirect_route)

    product_additions = ProductAddition.objects.filter(id__in=product_id_list)
    logger.info(
        "Updating %d product additions from barcode sheet form for client '%s' for store: '%s'",
        len(product_additions),
        request.POST.get("parent-company"),
        request.POST.get("store-name"),
    )

    for product_addition in product_additions:
        util.record_product_addition(product_addition, is_product_scanned=True)

    messages.success(request, f"Submitted {len(product_id_list)} item(s) as In-Distribution")
    return HttpResponseRedirect(redirect_route)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def set_not_carried_product_additions(request: HttpRequest) -> HttpResponse:
    redirect_route: str | None = request.META.get("HTTP_REFERER")
    if redirect_route is None:
        return HttpResponseServerError()

    product_id_list = request.POST.getlist("product-addition-id")
    if not product_id_list:
        logger.info("Barcode sheet form returned 0 new products. Redirecting with error message")
        messages.error(request, "Error. Received 0 new products to update")
        return HttpResponseRedirect(redirect_route)

    product_additions = ProductAddition.objects.filter(id__in=product_id_list)
    logger.info(
        "Updating %s product additions from barcode sheet form for client '%s' for store: '%s'",
        len(product_additions),
        request.POST.get("parent-company"),
        request.POST.get("store-name"),
    )

    for product_addition in product_additions:
        util.set_not_carried(product_addition)

    messages.success(request, f"Submitted {len(product_id_list)} item(s) as Not-Carried")
    return HttpResponseRedirect(redirect_route)
