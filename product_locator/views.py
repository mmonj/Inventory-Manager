import json
import logging

from django.contrib import messages
from django import forms
from django.shortcuts import render, redirect
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import models, serializers, planogram_parser

logger = logging.getLogger("main_logger")


class PlanogramModelForm(forms.Form):
    planogram_text_dump = forms.CharField(max_length=100000, widget=forms.Textarea)
    planogram_id = forms.ModelChoiceField(
        queryset=models.Planogram.objects.all().order_by("store__name").select_related("store"),
        empty_label="Select a store"
        )


def index(request):
    stores = models.Store.objects.all()
    stores_json = serializers.StoreSerializer(stores, many=True).data
    stores_json = json.dumps(stores_json)

    return render(request, "product_locator/index.html", {
        "stores": stores_json,
    })


def add_new_products(request):
    if request.method == "GET":
        return render(request, "product_locator/add_new_products.html", {
            "planogram_form": PlanogramModelForm()
        })
    elif request.method == "POST":
        planogram_id = request.POST.get("planogram_id")
        planogram_text_dump = request.POST.get("planogram_text_dump")
        planogram: dict = planogram_parser.parse_data(planogram_text_dump)

        received_form = PlanogramModelForm(request.POST)
        if not received_form.is_valid():
            return render(request, "product_locator/add_new_products.html", {
                "planogram_form": received_form
            })

        if not planogram:
            messages.error(request, "You have submitted data that resulted in 0 items being parsed.")
            return render(request, "product_locator/add_new_products.html", {
                "planogram_form": PlanogramModelForm(request.POST)
            })

        messages.success(request, f"Submitted {len(planogram)} items successfully")
        return redirect("product_locator:add_new_products")


@api_view(["GET"])
def get_product_location(request):
    if request.method == "GET":
        store = models.Store.objects.get(id=request.GET.get("store_id"))
        upc = request.GET.get("upc")

        try:
            product = models.Product.objects.get(upc=upc)
        except models.Product.DoesNotExist:
            return Response([], status=404)

        home_locations = models.HomeLocation.objects.filter(planogram__store=store, products__in=[product])
        resp_json = serializers.HomeLocationSerializer(home_locations, many=True).data

        return Response(resp_json)
