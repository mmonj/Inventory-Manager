import json
import logging
import urllib.parse

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404, HttpResponseRedirect
from django.urls import reverse_lazy, reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.encoding import iri_to_uri
from django.views.decorators.http import require_http_methods

from . import forms, serializers, util
from products import models
from products.util import import_new_stores

logger = logging.getLogger("main_logger")


@require_http_methods(["GET", "POST"])
def login_view(request):
    if request.user.is_authenticated:
        logger.info(f"User {request.user.get_username()} is already logged in. Redirecting to homepage index")
        return redirect("homepage:index")

    if request.method == 'GET':
        return render(request, 'logger/login.html')
    else:
        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)

            next_url = iri_to_uri(request.POST.get('next', '/'))
            if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts=None):
                return redirect(next_url)

            return redirect("homepage:index")
        else:
            return render(request, "logger/login.html", {
                "is_invalid_credentials": True
            })


@require_http_methods(["GET"])
def logout_view(request):
    logout(request)
    return redirect("logger:login_view")


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["GET"])
def scanner(request):
    territory_list = util.get_territory_list()

    return render(request, 'logger/scanner.html', {
        'territory_list': json.dumps(territory_list)
    })


@require_http_methods(["POST"])
def log_product_scan(request):
    body = json.loads(request.body)

    try:
        product, _is_new_product = models.Product.objects.get_or_create(upc=body['upc'])
    except ValidationError as ex:
        return JsonResponse(
            {'message': 'Bad request', 'errors': [f for f in dict(ex)['__all__']]},
            status=400
        )

    store = models.Store.objects.get(pk=body['store_id'])
    product_addition, _ = models.ProductAddition.objects.get_or_create(product=product, store=store)
    if body['is_remove']:
        util.set_not_carried(product_addition)
        logger.info(f"Set product addition record (un-carry) for '{product.upc}' for store '{store.name}'")
    else:
        util.record_product_addition(product_addition, is_product_scanned=True)
        logger.info(f"Set product addition record (carry) for '{product.upc}' for store '{store.name}'")

    resp_json = {
        'product_info': {
            'upc': product_addition.product.upc,
            'name': product_addition.product.name or '',
            'store_name': product_addition.store.name,
            'is_carried': product_addition.is_carried
        }
    }

    return JsonResponse(resp_json)


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["GET", "POST"])
def add_new_stores(request):
    if request.method == 'GET':
        return render(request, 'logger/add_new_stores.html', {
            'form': forms.NewStoresForm()
        })

    received_form = forms.NewStoresForm(request.POST)
    if not received_form.is_valid():
        return render(request, 'logger/add_new_stores.html', {
            'form': received_form,
            'form_errors': received_form.errors
        })

    new_stores = [s for s in (f.strip() for f in received_form.cleaned_data['stores_text'].split('\n')) if s]
    logger.info(f'Adding new stores from user input. {len(new_stores)} possible new stores submitted.')
    import_new_stores(new_stores)

    messages.success(request, "Your submission was successful")
    return redirect('logger:add_new_stores')


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["GET"])
def scan_history(request):
    if not request.GET:
        territory_list = util.get_territory_list()

        return render(request, 'logger/scan_history.html', {
            'territory_list': json.dumps(territory_list)
        })

    store_id = request.GET.get('store-id')
    store = models.Store.objects.get(pk=store_id)
    product_additions = models.ProductAddition.objects.filter(
        store=store, is_carried=True).order_by('-date_last_scanned')[:100]
    for product_addition in product_additions:
        product_addition.product.name = product_addition.product.name or 'Unknown product name'

    return render(request, 'logger/scan_history.html', {
        'product_additions': product_additions,
        'store_name': store.name
    })


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["POST"])
def uncarry_product_addition(request, product_addition_pk):
    product_addition = models.ProductAddition.objects.get(pk=product_addition_pk)
    product_addition.is_carried = False
    product_addition.save(update_fields=['is_carried'])

    return JsonResponse({'message': 'success'})


@login_required(login_url=reverse_lazy('logger:login_view'))
@require_http_methods(["GET", "POST"])
def import_json_data_files(request):
    from products import util

    if request.method == 'GET':
        return render(request, 'logger/import_json_data_files.html', {
            'form': forms.ImportJsonDataFiles()
        })

    received_form = forms.ImportJsonDataFiles(request.POST, request.FILES)
    if not received_form.is_valid():
        return render(request, 'logger/import_json_data_files.html', {
            'form': received_form,
            'form_errors': received_form.errors
        })

    field_reps_info = json.load(request.FILES['field_reps_json'])
    territory_info = json.load(request.FILES['territory_info_json'])
    products_info = json.load(request.FILES['product_names_json'])
    stores_distribution_data = json.load(request.FILES['store_distribution_data_json'])
    product_images_zip = request.FILES['product_images_zip']
    brand_logos_zip = request.FILES['brand_logos_zip']

    util.import_field_reps(field_reps_info)
    util.import_territories(territory_info)
    util.import_products(products_info,
                         images_zip_path=product_images_zip.temporary_file_path(),
                         brand_logos_zip=brand_logos_zip.read())
    util.import_distribution_data(stores_distribution_data)

    messages.success(request, "Your submission was successful")
    return redirect('logger:import_json_data_files')


@require_http_methods(["GET"])
def barcode_sheet_history(request, field_representative_id=None):
    fields_to_prefetch = ["store", "parent_company", "product_additions", "work_cycle"]

    field_representatives = models.FieldRepresentative.objects.all()
    if field_representative_id is None:
        recent_barcode_sheets = models.BarcodeSheet.objects.all()\
            .order_by("-id").prefetch_related(*fields_to_prefetch)[:20]
    else:
        recent_barcode_sheets = models.BarcodeSheet.objects.filter(store__field_representative=field_representative_id)\
            .order_by("-id").prefetch_related(*fields_to_prefetch)[:20]

    return render(request, "logger/barcode_sheet_history.html", {
        "field_representatives": field_representatives,
        "recent_barcode_sheets": recent_barcode_sheets,
        "field_representative_id": field_representative_id
    })


@require_http_methods(["GET"])
def get_barcode_sheet(request, barcode_sheet_id):
    barcode_sheet = get_object_or_404(
        models.BarcodeSheet.objects.prefetch_related("store", "parent_company", "product_additions"),
        id=barcode_sheet_id)

    barcode_sheet_data = serializers.BarcodeSheetSerializer(
        barcode_sheet,
        context={
            'work_cycle': barcode_sheet.work_cycle
        }
    ).data

    logger.info(
        f"Serving Barcode Sheet. Client: '{barcode_sheet.parent_company.short_name}' - "
        f"Store: '{barcode_sheet.store.name}'")

    return render(request, "logger/barcode_sheet.html", {
        **barcode_sheet_data,
        "sheet_type": request.GET.get("sheet-type"),
        "exclude_bs_overrides": True
    })


@require_http_methods(["GET", "POST"])
def get_manager_names(request):
    if request.method == "GET":
        field_reps = models.FieldRepresentative.objects.prefetch_related("stores").all()
        field_reps_data = serializers.FieldRepresentativeStoresManagersSerializer(field_reps, many=True).data

        return render(request, "logger/get_manager_names.html", {
            "territory_list": json.dumps(field_reps_data)
        })
    elif request.method == "POST":
        # if user has chosen to update existing contact names
        if "contact-id" in request.POST:
            with transaction.atomic():
                personnel_contacts = models.PersonnelContact.objects.select_for_update().in_bulk(
                    request.POST.getlist("contact-id"))

                updated_contacts = []
                for contact_id, first_name, last_name in zip(
                        request.POST.getlist("contact-id"),
                        request.POST.getlist("contact-first-name"),
                        request.POST.getlist("contact-last-name")
                ):
                    existing_contact = personnel_contacts[int(contact_id)]
                    if (first_name, last_name) != (existing_contact.first_name, existing_contact.last_name):
                        existing_contact.first_name = first_name
                        existing_contact.last_name = last_name
                        updated_contacts.append(existing_contact)

                models.PersonnelContact.objects.bulk_update(updated_contacts, ["first_name", "last_name"])

        # indicates if user has chosen to add a new contact to a store that previously had none
        if "store-id" in request.POST:
            with transaction.atomic():
                new_contacts = []
                stores = models.Store.objects.select_for_update().in_bulk(request.POST.getlist("store-id"))

                for store_id, first_name, last_name in zip(
                    request.POST.getlist("store-id"),
                    request.POST.getlist("new-contact-first-name"),
                    request.POST.getlist("new-contact-last-name")
                ):
                    personnel_contact = models.PersonnelContact(
                        first_name=first_name, last_name=last_name, store=stores[int(store_id)])
                    new_contacts.append(personnel_contact)

                models.PersonnelContact.objects.bulk_create(new_contacts)

        messages.success(request, "Submitted contact names successfully")
        return redirect("logger:get_manager_names")


@require_http_methods(["POST"])
def set_carried_product_additions(request):
    product_additions = models.ProductAddition.objects.filter(id__in=request.POST.getlist("product-addition-id"))
    for product_addition in product_additions:
        logger.info("Recording product addition from barcode sheet for client '{}' for store: '{}'".format(
            request.POST.get("parent-company"),
            request.POST.get("store-name")
        ))
        util.record_product_addition(product_addition, is_product_scanned=True)

    redirect_route = reverse("logger:get_barcode_sheet", args=[request.POST.get("barcode-sheet-id")]) \
        + "?" + urllib.parse.urlencode({
            "store-name": request.POST.get("store-name"),
            "sheet-type": "out-of-dist"
        })

    messages.success(request, "Submitted Successfully")
    return HttpResponseRedirect(redirect_route)
