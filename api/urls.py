from django.urls import path

from . import views

app_name = "api"
urlpatterns = [
    path("validate_api_token/", views.validate_api_token, name="validate_api_token"),
    path("get_field_rep_info/", views.get_field_rep_info, name="get_field_rep_info"),
    path(
        "get_store_product_additions/",
        views.get_store_product_additions,
        name="get_store_product_additions",
    ),
    path("get_field_reps/", views.get_field_reps, name="get_field_reps"),
    path("update_store_field_rep/", views.update_store_field_rep, name="update_store_field_rep"),
    path(
        "get_matching_stores/",
        views.get_matching_stores,
        name="get_matching_stores",
    ),
]
