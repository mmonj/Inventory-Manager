from django.urls import path

from . import views

app_name = "logger"
urlpatterns = [
    path("", views.index, name="index"),
    path("log_product_scan/", views.log_product_scan, name="log_product_scan"),
    path("add_new_stores/", views.add_new_stores, name="add_new_stores"),
    path("scan_history/", views.scan_history, name="scan_history"),
    path("uncarry_product_addition/<int:product_addition_pk>/",
         views.uncarry_product_addition, name="uncarry_product_addition"),
    path("import_json_data_files/", views.import_json_data_files, name="import_json_data_files"),
]
