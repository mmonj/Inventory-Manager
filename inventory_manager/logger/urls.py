from django.urls import path

from . import views

app_name = "logger"
urlpatterns = [
    path("", views.index, name="index"), 
    path("log_upc", views.log_upc, name="log_upc"), 
    path("add_new_stores", views.add_new_stores, name="add_new_stores"), 
]
