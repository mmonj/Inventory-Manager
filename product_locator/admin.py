from typing import cast

from django.contrib import admin
from django.db import models
from django.http import HttpRequest

from .models import HomeLocation, Planogram, Product, ProductScanAudit, Store


class ProductInline(admin.TabularInline):  # type: ignore[type-arg]
    model = Product.home_locations.through
    extra = 0
    verbose_name = "Product"
    verbose_name_plural = "Products"
    fields = ("product",)
    readonly_fields = ("product",)


@admin.register(Planogram)
class PlanogramAdmin(admin.ModelAdmin[Planogram]):
    search_fields = ("name",)
    list_display = ("name", "store")
    list_filter = ("store",)


@admin.register(HomeLocation)
class HomeLocationAdmin(admin.ModelAdmin[HomeLocation]):
    search_fields = ("name", "planogram__name")
    list_display = ("name", "planogram")
    list_filter = ("planogram", "planogram__store")
    inlines = (ProductInline,)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin[Product]):
    search_fields = ("upc", "name")
    list_display = ("upc", "name")
    list_filter = ("home_locations__planogram", "home_locations__planogram__store")
    autocomplete_fields = ("home_locations",)


@admin.register(ProductScanAudit)
class ProductScanAuditAdmin(admin.ModelAdmin[ProductScanAudit]):
    search_fields = ("product_type",)
    list_display = ("product_type", "datetime_created", "products_count")

    def get_queryset(self, request: HttpRequest) -> models.QuerySet[ProductScanAudit]:
        qs = super().get_queryset(request)
        return qs.annotate(models.Count("products_in_stock"))

    def products_count(self, scan_audit: ProductScanAudit) -> int:
        return cast(int, scan_audit.products_in_stock__count)  # type:ignore [attr-defined]

    products_count.admin_order_field = "products_in_stock__count"  # type:ignore [attr-defined]


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin[Store]):
    search_fields = ("name",)
    list_display = ("name",)
