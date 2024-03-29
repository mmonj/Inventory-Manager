from django.conf import settings
from django.urls import path

from . import views

app_name = "homepage"
urlpatterns = [
    path("", views.index, name="index"),
]

if settings.DEBUG:
    urlpatterns += [
        path("debug-404", views.error404),
        path("debug-500", views.error500),
    ]
