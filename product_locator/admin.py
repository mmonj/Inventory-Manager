from django.contrib import admin
from django.db import models
from django.http import HttpRequest
from django_stubs_ext import QuerySetAny

from .models import HomeLocation, Planogram, Product, ProductScanAudit, Store


class PlanogramAdmin(admin.ModelAdmin[Planogram]):
    search_fields = ["name"]
    list_display = ["name", "store"]
    list_filter = ["store"]


class HomeLocationAdmin(admin.ModelAdmin[HomeLocation]):
    search_fields = ["name", "planogram__name"]
    list_display = ["name", "planogram"]
    list_filter = ["planogram", "planogram__store"]


class ProductAdmin(admin.ModelAdmin[Product]):
    search_fields = ["upc", "name", "home_locations__name"]
    list_display = ["upc", "name"]
    list_filter = ["home_locations__planogram", "home_locations__planogram__store"]


class ProductScanAuditAdmin(admin.ModelAdmin[ProductScanAudit]):
    search_fields = ["product_type"]
    list_display = ["product_type", "datetime_created", "products_count"]

    def get_queryset(self, request: HttpRequest) -> QuerySetAny[ProductScanAudit, ProductScanAudit]:
        qs = super(ProductScanAuditAdmin, self).get_queryset(request)
        qs = qs.annotate(models.Count("products_in_stock"))
        return qs

    def products_count(self, scan_audit: ProductScanAudit) -> int:
        count: int = scan_audit.products_in_stock__count  # type:ignore [attr-defined]
        return count

    setattr(products_count, "admin_order_field", "products_in_stock__count")


admin.site.register(Store)
admin.site.register(Planogram, PlanogramAdmin)
admin.site.register(HomeLocation, HomeLocationAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(ProductScanAudit, ProductScanAuditAdmin)
