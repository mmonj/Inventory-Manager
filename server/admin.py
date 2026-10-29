from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from .models import GlobalSettings


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin[GlobalSettings]):
    list_display = ("__str__", "qt_live_until")
    actions = ("open_qt_live_window", "close_qt_live_window")

    @admin.action(description="Go live with Qt for 10 minutes")
    def open_qt_live_window(
        self, _request: HttpRequest, queryset: QuerySet[GlobalSettings]
    ) -> None:
        for global_settings in queryset:
            global_settings.open_qt_live_window()

    @admin.action(description="Close the Qt live window")
    def close_qt_live_window(
        self, _request: HttpRequest, queryset: QuerySet[GlobalSettings]
    ) -> None:
        for global_settings in queryset:
            global_settings.close_qt_live_window()

    def has_add_permission(self, _request: HttpRequest) -> bool:
        return not GlobalSettings.objects.exists()

    def has_delete_permission(
        self, _request: HttpRequest, _obj: GlobalSettings | None = None
    ) -> bool:
        return False
