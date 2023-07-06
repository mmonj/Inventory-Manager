from django.urls import path

from . import views

app_name = "logger"
urlpatterns = [
    path("scanner/", views.scanner, name="scanner"),
    path("login/", views.login_view, name="login_view"),
    path("logout/", views.logout_view, name="logout_view"),
    path("log_product_scan/", views.log_product_scan, name="log_product_scan"),
    path("add_new_stores/", views.add_new_stores, name="add_new_stores"),
    path("scan_history/", views.scan_history, name="scan_history"),
    path(
        "uncarry_product_addition/<int:product_addition_pk>/",
        views.uncarry_product_addition,
        name="uncarry_product_addition",
    ),
    path("import_json_data_files/", views.import_json_data_files, name="import_json_data_files"),
    path("barcode_sheet_history/", views.barcode_sheet_history, name="barcode_sheet_history"),
    path(
        "barcode_sheet_history/<int:field_representative_id>/",
        views.barcode_sheet_history,
        name="barcode_sheet_history",
    ),
    path(
        "barcode_sheet/<int:barcode_sheet_id>/", views.get_barcode_sheet, name="get_barcode_sheet"
    ),
    path("get_manager_names/", views.get_manager_names, name="get_manager_names"),
    path(
        "set_carried_product_additions/",
        views.set_carried_product_additions,
        name="set_carried_product_additions",
    ),
]
