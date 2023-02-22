import json
import logging

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.templatetags.static import static

from . import forms, serializers
from products import models
from products.util import import_new_stores

logger = logging.getLogger("main_logger")


def login_view(request):
    logger.info(static("logger/scan_sound.ogg"))
    if request.user.is_authenticated:
        logger.info(f"User {request.user.get_username()} is already logged in. Redirecting to logger index")
        return redirect("logger:index")

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
            return redirect("logger:index")
        else:
            return render(request, "logger/login.html", {
                "message": "Invalid username and/or password."
            })


def logout_view(request):
    logout(request)
    return redirect("logger:login_view")


@login_required(login_url=reverse_lazy('logger:login_view'))
def index(request):
    territory_info = get_territory_info()
    return render(request, 'logger/index.html', {
        'territory_info': json.dumps(territory_info)
    })


def log_product_scan(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method type forbidden'}, status=405)

    body = json.loads(request.body)

    try:
        product, _is_new_product = models.Product.objects.get_or_create(upc=body['upc'])
    except ValidationError as ex:
        return JsonResponse(
            {'message': 'Bad request', 'errors': [f for f in dict(ex)['__all__']]},
            status=400
        )

    store = models.Store.objects.get(pk=body['store_id'])
    if body['is_remove']:
        product_addition = set_not_carried(product, store)
    else:
        product_addition = record_product_addition(product, store, is_product_scanned=True)

    resp_json = {
        'product_info': {
            'upc': product_addition.product.upc,
            'name': product_addition.product.name or '',
            'store_name': product_addition.store.name,
            'is_carried': product_addition.is_carried
        }
    }

    return JsonResponse(resp_json)


def record_product_addition(product, store, is_product_scanned=False):
    product_addition, _is_new_product_addition = models.ProductAddition.objects.get_or_create(
        product=product,
        store=store
    )

    if is_product_scanned and not product_addition.is_carried:
        product_addition.is_carried = True
        product_addition.save(update_fields=['is_carried'])

    product_addition.update_date_scanned()
    product_addition.save(update_fields=['date_last_scanned'])

    return product_addition


def set_not_carried(product, store):
    product_addition = models.ProductAddition.objects.get(
        product=product,
        store=store
    )

    if product_addition.is_carried:
        product_addition.is_carried = False
        product_addition.save(update_fields=['is_carried'])

    return product_addition


def get_territory_info():
    territory_info = {
        'territory_list': []
    }
    territory_list = territory_info['territory_list']

    field_reps = models.FieldRepresentative.objects.all()
    for field_rep in field_reps:
        territory_list.append(
            {
                'field_rep_name': field_rep.name,
                'field_rep_id': field_rep.pk,
                # add list of dictionaries to 'stores' key
                'stores': [
                    {'store_name': store.name, 'store_id': store.pk} for store in field_rep.stores.all()
                ]
            }
        )

    return territory_info


@login_required(login_url=reverse_lazy('logger:login_view'))
def add_new_stores(request):
    if request.method == 'GET':
        return render(request, 'logger/add_new_stores.html', {
            'form': forms.NewStoresForm()
        })

    received_form = forms.NewStoresForm(request.POST)
    if not received_form.is_valid():
        error_messages = []
        for field, errors in received_form.errors.items():
            for error in errors:
                error_messages.append(f'{field}: {error}')

        return render(request, 'logger/add_new_stores.html', {
            'form': received_form,
            'error_messages': error_messages
        })

    new_stores = []
    logger.info('Json Decode error: falling back to parsing from raw text')
    new_stores = [s for s in (f.strip() for f in received_form.cleaned_data['stores_text'].split('\n')) if s]
    import_new_stores(new_stores)

    return redirect('logger:add_new_stores')


@login_required(login_url=reverse_lazy('logger:login_view'))
def scan_history(request):
    if not request.GET:
        territory_info = get_territory_info()
        return render(request, 'logger/scan_history.html', {
            'territory_info': json.dumps(territory_info)
        })

    store_id = request.GET.get('store-id')[0]
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
def uncarry_product_addition(request, product_addition_pk):
    product_addition = models.ProductAddition.objects.get(pk=product_addition_pk)
    product_addition.is_carried = False
    product_addition.save(update_fields=['is_carried'])

    return JsonResponse({'message': 'success'})


@login_required(login_url=reverse_lazy('logger:login_view'))
def import_json_data_files(request):
    from products import util

    if request.method == 'GET':
        return render(request, 'logger/import_json_data_files.html', {
            'form': forms.ImportJsonDataFiles()
        })

    form = forms.ImportJsonDataFiles(request.POST, request.FILES)
    if form.is_valid:
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

    return redirect('logger:import_json_data_files')


def pick_barcode_sheet(request):
    return render(request, "logger/pick_barcode_sheet.html")


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

    return render(request, "logger/barcode_sheet.html", {
        **barcode_sheet_data
    })
