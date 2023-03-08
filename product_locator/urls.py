from django.urls import path
from . import views

app_name = "product_locator"
urlpatterns = [
    path("", views.index, name="index"),
    path("add_new_products/", views.add_new_products, name="add_new_products"),
    path("get_product_location/", views.get_product_location, name="get_product_location"),
]
