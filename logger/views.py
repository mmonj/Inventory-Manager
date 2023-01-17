import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render, HttpResponse, redirect
from .forms import NewStoresForm
from products import models
import products.helpers


# Create your views here.
def index(request):
    field_rep_stores_info = get_field_rep_stores_info()
    return render(request, 'logger/index.html', {
        'field_rep_stores_info': json.dumps(field_rep_stores_info)
    })


def log_upc(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'Method type forbidden'}, status=405)

    body = json.loads(request.body)

    try:
        existing_product, new_product = models.Product.objects.get_or_create(upc=body['upc'])
    except ValidationError as ex:
        return JsonResponse(
            { 'message': 'Bad request', 'errors': [f for f in dict(ex)['__all__']] },
            status=400
        )
    product = existing_product or new_product

    resp_json = {
        'product_info': {
            'upc': product.upc, 
            'name': product.name or None
        }
    }

    return JsonResponse(resp_json)


def get_field_rep_stores_info():
    ret_dict = {
        'field_reps_list': []
    }
    field_reps_list = ret_dict['field_reps_list']
    
    field_reps = models.FieldRepresentative.objects.all()
    for field_rep in field_reps:
        field_reps_list.append(
            {
                'field_rep_name': field_rep.name, 
                'field_rep_id': field_rep.pk, 
                'stores': [
                    {'store_name': store.name, 'store_id': store.pk} for store in field_rep.stores.all()
                ]
            }
        )
    
    return ret_dict



def add_new_stores(request):
    if request.method == 'GET':
        return render(request, 'logger/add_new_stores.html', {
            'form': NewStoresForm()
        })

    received_form = NewStoresForm(request.POST)
    if not received_form.is_valid():
        error_messages = []
        for field, errors in received_form.errors.items():
            for error in errors:
                error_messages.append( f'{field}: {error}' )

        return render(request, 'logger/add_new_stores.html', {
            'form': received_form, 
            'error_messages': error_messages
        })

    new_stores = []
    try:
        categorized_store_listings = json.loads(received_form.cleaned_data['stores_text'])
        products.helpers.import_employee_stores(categorized_store_listings)
    except json.decoder.JSONDecodeError as e:
        products.helpers.printerr('Json Decode error: falling back to parsing from raw text')
        new_stores = [s for s in (f.strip() for f in received_form.cleaned_data['stores_text'].split('\n')) if s]
        for store_name in new_stores:
            products.helpers.add_store(store_name)

    return redirect('logger:add_new_stores')
    