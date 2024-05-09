from django.urls import path

from . import views

app_name = "api"
urlpatterns = [
    path("validate_api_token/", views.validate_api_token, name="validate_api_token"),
    # path("get_field_rep_info/", views.get_field_rep_info, name="get_field_rep_info"),
    path(
        "get_store_product_additions/",
        views.get_store_product_additions,
        name="get_store_product_additions",
    ),
    path("get_field_reps/", views.get_field_reps, name="get_field_reps"),
    path("update_store_field_rep/", views.update_store_field_rep, name="update_store_field_rep"),
    path(
        "update_store_info/",
        views.update_store_info,
        name="update_store_info",
    ),
    path("update_store_personnel/", views.update_store_personnel, name="update_store_personnel"),
    path("update_cmk_html_src/", views.update_cmk_html_src, name="update_cmk_html_src"),
]
