import json
from django.http import JsonResponse
from django.shortcuts import render, HttpResponse, redirect
from .forms import NewStoresForm
import products.helpers


# Create your views here.
def index(request):
    return render(request, 'logger/index.html')


def log_upc(request):
    import json
    body = json.loads(request.body)
    products.helpers.printerr(body['upc'])

    return JsonResponse({'message': 'Success'})


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
        all_stores_dict = json.loads(received_form.cleaned_data['stores_text'])
        if isinstance(all_stores_dict, list):
            new_stores = all_stores_dict
        else:
            new_stores = all_stores_dict['All Stores'].keys()
    except json.decoder.JSONDecodeError as e:
        products.helpers.printerr('Json Decode error: falling back to parsing from raw text')
        new_stores = [s for s in (f.strip() for f in received_form.cleaned_data['stores_text'].split('\n')) if s]

    for store_name in new_stores:
        products.helpers.add_store(store_name)

    return redirect('logger:add_new_stores')
    