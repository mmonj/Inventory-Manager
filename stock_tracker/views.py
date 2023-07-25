import json
import logging
from typing import List, Optional
import urllib.parse

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Prefetch
from django.http import (
    HttpRequest,
    HttpResponse,
    HttpResponseNotFound,
    JsonResponse,
    HttpResponseRedirect,
)
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy, reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.encoding import iri_to_uri
from django.views.decorators.http import require_http_methods

from .types import SheetTypeDescriptionInterface

from . import forms, serializers, util, templates
from products.models import (
    Product,
    ProductAddition,
    BarcodeSheet,
    FieldRepresentative,
    PersonnelContact,
    Store,
)
from products.util import import_new_stores

logger = logging.getLogger("main_logger")


@require_http_methods(["GET", "POST"])
def login_view(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        logger.info(
            f"User {request.user.get_username()} is already logged in. Redirecting to homepage index"
        )
        return redirect("homepage:index")

    if request.method == "GET":
        return render(request, "stock_tracker/login.html")
    else:
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

            return redirect("homepage:index")
        else:
            return render(request, "stock_tracker/login.html", {"is_invalid_credentials": True})


@require_http_methods(["GET"])
def logout_view(request: HttpRequest) -> HttpResponse:
    logout(request)
    return redirect("stock_tracker:login_view")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scanner(request: HttpRequest) -> HttpResponse:
    territory_list = util.get_territory_list()

    return render(
        request, "stock_tracker/scanner.html", {"territory_list": json.dumps(territory_list)}
    )


@require_http_methods(["POST"])
def log_product_scan(request: HttpRequest) -> HttpResponse:
    body = json.loads(request.body)

    try:
        product, _is_new_product = Product.objects.get_or_create(upc=body["upc"])
    except ValidationError as ex:
        return JsonResponse(
            {"message": "Bad request", "errors": [f for f in ex.__dict__["__all__"]]}, status=400
        )

    store = Store.objects.get(pk=body["store_id"])
    product_addition, _ = ProductAddition.objects.get_or_create(product=product, store=store)
    if body["is_remove"]:
        util.set_not_carried(product_addition)
        logger.info(
            f"Set product addition record (un-carry) for '{product.upc}' for store '{store.name}'"
        )
    else:
        util.record_product_addition(product_addition, is_product_scanned=True)
        logger.info(
            f"Set product addition record (carry) for '{product.upc}' for store '{store.name}'"
        )

    resp_json = {
        "product_info": {
            "upc": product_addition.product.upc,
            "name": product_addition.product.name or "",
            "store_name": product_addition.store.name,
            "is_carried": product_addition.is_carried,
        }
    }

    return JsonResponse(resp_json)


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def add_new_stores(request: HttpRequest) -> HttpResponse:
    if request.method == "GET":
        return render(request, "stock_tracker/add_new_stores.html", {"form": forms.NewStoresForm()})

    received_form = forms.NewStoresForm(request.POST)
    if not received_form.is_valid():
        return render(
            request,
            "stock_tracker/add_new_stores.html",
            {"form": received_form, "form_errors": received_form.errors},
        )

    new_stores_from_post: str = received_form.cleaned_data["stores_text"]
    new_stores = [s for s in (f.strip() for f in new_stores_from_post.split("\n")) if s]
    logger.info(
        f"Adding new stores from user input. {len(new_stores)} possible new stores submitted."
    )
    import_new_stores(new_stores)

    messages.success(request, "Your submission was successful")
    return redirect("stock_tracker:add_new_stores")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def scan_history(request: HttpRequest) -> HttpResponse:
    if not request.GET:
        territory_list = util.get_territory_list()

        return render(
            request,
            "stock_tracker/scan_history.html",
            {"territory_list": json.dumps(territory_list)},
        )

    store_id = request.GET.get("store-id")
    if store_id is None:
        return HttpResponseNotFound()

    store = Store.objects.get(pk=store_id)
    product_additions = ProductAddition.objects.filter(store=store, is_carried=True).order_by(
        "-date_last_scanned"
    )[:100]
    for product_addition in product_additions:
        product_addition.product.name = product_addition.product.name or "Unknown product name"

    return render(
        request,
        "stock_tracker/scan_history.html",
        {"product_additions": product_additions, "store_name": store.name},
    )


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["POST"])
def uncarry_product_addition(request: HttpRequest, product_addition_pk: int) -> HttpResponse:
    product_addition = ProductAddition.objects.get(pk=product_addition_pk)
    product_addition.is_carried = False
    product_addition.save(update_fields=["is_carried"])

    return JsonResponse({"message": "success"})


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET", "POST"])
def import_json_data_files(request: HttpRequest) -> HttpResponse:
    from products import util

    if request.method == "GET":
        return render(
            request,
            "stock_tracker/import_json_data_files.html",
            {"form": forms.ImportJsonDataFiles()},
        )

    received_form = forms.ImportJsonDataFiles(request.POST, request.FILES)
    if not received_form.is_valid():
        return render(
            request,
            "stock_tracker/import_json_data_files.html",
            {"form": received_form, "form_errors": received_form.errors},
        )

    field_reps_info = json.load(request.FILES["field_reps_json"])  # type: ignore[arg-type]
    territory_info = json.load(request.FILES["territory_info_json"])  # type: ignore[arg-type]
    products_info = json.load(request.FILES["product_names_json"])  # type: ignore[arg-type]
    stores_distribution_data = json.load(request.FILES["store_distribution_data_json"])  # type: ignore[arg-type]
    product_images_zip = request.FILES["product_images_zip"]
    brand_logos_zip = request.FILES["brand_logos_zip"]

    util.import_field_reps(field_reps_info)
    util.import_territories(territory_info)
    util.import_products(
        products_info,
        images_zip_path=product_images_zip.temporary_file_path(),  # type: ignore[union-attr]
        brand_logos_zip=brand_logos_zip.read(),  # type: ignore[union-attr]
    )
    util.import_distribution_data(stores_distribution_data)

    messages.success(request, "Your submission was successful")
    return redirect("stock_tracker:import_json_data_files")


@login_required(login_url=reverse_lazy("stock_tracker:login_view"))
@require_http_methods(["GET"])
def barcode_sheet_history(
    request: HttpRequest, field_representative_id: Optional[int] = None
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
    possible_sheet_types_info: List[SheetTypeDescriptionInterface] = [
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
            Prefetch(
                "product_additions",
                queryset=ProductAddition.objects.filter(
                    is_carried__in=sheet_query_info["is_carried_list"]
                ),
            ),
        ),
        id=barcode_sheet_id,
    )

    barcode_sheet_data = serializers.BarcodeSheetSerializer(
        barcode_sheet, context={"work_cycle": barcode_sheet.work_cycle}
    ).data

    logger.info(
        f"Serving Barcode Sheet. Client: '{barcode_sheet.parent_company}' - "
        f"Store: '{barcode_sheet.store.name}'"
    )

    return templates.StockTrackerBarcodeSheet(
        barcodeSheet=barcode_sheet_data,  # type: ignore[arg-type]
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
def set_carried_product_additions(request: HttpRequest) -> HttpResponse:
    product_id_list = request.POST.getlist("product-addition-id")
    redirect_route = (
        reverse("stock_tracker:get_barcode_sheet", args=[request.POST.get("barcode-sheet-id")])
        + "?"
        + urllib.parse.urlencode(
            {"store-name": request.POST.get("store-name"), "sheet-type": "out-of-dist"}
        )
    )

    if not product_id_list:
        logger.info("Barcode sheet form returned 0 new products. Redirecting with error message")
        messages.error(request, "Error. Received 0 new products to update")
        return HttpResponseRedirect(redirect_route)

    product_additions = ProductAddition.objects.filter(id__in=product_id_list)
    logger.info(
        "Updating {} product additions from barcode sheet form for client '{}' for store: '{}'".format(
            len(product_additions),
            request.POST.get("parent-company"),
            request.POST.get("store-name"),
        )
    )

    for product_addition in product_additions:
        util.record_product_addition(product_addition, is_product_scanned=True)

    messages.success(request, "Submitted Successfully")
    return HttpResponseRedirect(redirect_route)
