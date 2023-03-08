from django.urls import path
from . import views

app_name = "product_locator"
urlpatterns = [
    path("", views.index, name="index"),
    path("get_product_location/", views.get_product_location, name="get_product_location"),
]
