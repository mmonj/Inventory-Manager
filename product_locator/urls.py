from django.urls import path
from . import views

app_name = "product_locator"
urlpatterns = [
    path("", views.index, name="index"),
    path("add_product_location/", views.add_product_location, name="add_product_location"),
]
