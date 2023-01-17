from django.urls import path

from . import views

app_name = "logger"
urlpatterns = [
    path("", views.index, name="index"), 
    path("log_product_scan", views.log_product_scan, name="log_product_scan"), 
    path("add_new_stores", views.add_new_stores, name="add_new_stores"), 
]
