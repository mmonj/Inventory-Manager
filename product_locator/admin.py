from django.contrib import admin

from .models import HomeLocation, Planogram, Product, Store


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


admin.site.register(Store)
admin.site.register(Planogram, PlanogramAdmin)
admin.site.register(HomeLocation, HomeLocationAdmin)
admin.site.register(Product, ProductAdmin)
