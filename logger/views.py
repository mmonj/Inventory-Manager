import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render, redirect

from . import forms
from products import models
import products.util


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
    products.util.printerr('Json Decode error: falling back to parsing from raw text')
    new_stores = [s for s in (f.strip() for f in received_form.cleaned_data['stores_text'].split('\n')) if s]
    products.util.add_new_stores(new_stores)

    return redirect('logger:add_new_stores')


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


def uncarry_product_addition(request, product_addition_pk):
    product_addition = models.ProductAddition.objects.get(pk=product_addition_pk)
    product_addition.is_carried = False
    product_addition.save(update_fields=['is_carried'])

    return JsonResponse({'message': 'success'})


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

        util.import_field_reps(field_reps_info)
        util.import_territories(territory_info)
        util.import_products(products_info)
        util.import_distribution_data(stores_distribution_data)

    return redirect('logger:import_json_data_files')
