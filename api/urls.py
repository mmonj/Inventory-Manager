from django.urls import path

from . import views

app_name = "api"
urlpatterns = [
    path("update_product_names/", views.update_product_names, name="update_product_names"), 
]
