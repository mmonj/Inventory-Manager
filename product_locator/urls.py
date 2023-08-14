from django.urls import path
from . import views

app_name = "product_locator"
urlpatterns = [
    path("", views.index, name="index"),
    path("add_new_products/", views.add_new_products, name="add_new_products"),
    path("get_product_location/", views.get_product_location, name="get_product_location"),
    path(
        "get_product_locations_by_name/<int:store_id>/<str:product_name>/",
        views.get_product_locations_by_name,
        name="get_product_locations_by_name",
    ),
    path(
        "add_new_product_location/", views.add_new_product_location, name="add_new_product_location"
    ),
    path(
        "api/get_planogram_locations/",
        views.get_planogram_locations,
        name="get_planogram_locations",
    ),
]
