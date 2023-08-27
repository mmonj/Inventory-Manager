from django.urls import path

from . import views
from .ajax import views as ajax_views
from .api import views as api_views

app_name = "product_locator"

pages = [
    path("", views.index, name="index"),
    path("add_new_products/", views.add_new_products, name="add_new_products"),
    path("scan_audit/", views.scan_audit, name="scan_audit"),
]

ajax = [
    path(
        "ajax/get_product_location/", ajax_views.get_product_location, name="get_product_location"
    ),
    path(
        "ajax/get_product_locations_by_name/<int:store_id>/<str:product_name>/",
        ajax_views.get_product_locations_by_name,
        name="get_product_locations_by_name",
    ),
    path(
        "ajax/add_new_product_location/",
        ajax_views.add_new_product_location,
        name="add_new_product_location",
    ),
    path(
        "ajax/add_upc_to_scan_audit/",
        ajax_views.add_upc_to_scan_audit,
        name="add_upc_to_scan_audit",
    ),
    path(
        "ajax/create_new_scan_audit/",
        ajax_views.create_new_scan_audit,
        name="create_new_scan_audit",
    ),
]

api = [
    path(
        "api/get_planogram_locations/",
        api_views.get_planogram_locations,
        name="get_planogram_locations",
    ),
    path(
        "api/get_products_from_latest_scan_audit/",
        api_views.get_products_from_latest_scan_audit,
        name="get_products_from_latest_scan_audit",
    ),
]

urlpatterns = pages + ajax + api
