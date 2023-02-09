from django.urls import path

from . import views

app_name = "api"
urlpatterns = [
    path("get_store_product_additions/", views.get_store_product_additions, name="get_store_product_additions"), 
    path("validate_api_token/", views.validate_api_token, name="validate_api_token"), 
]
