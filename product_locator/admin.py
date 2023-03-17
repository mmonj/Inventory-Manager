from django.contrib import admin
from . import models


class PlanogramAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ['name', 'store']
    list_filter = ['store']


class HomeLocationAdmin(admin.ModelAdmin):
    search_fields = ['name', 'planogram__name']
    list_display = ['name', 'planogram']
    list_filter = ['planogram', "planogram__store"]


class ProductAdmin(admin.ModelAdmin):
    search_fields = ['upc', 'name']
    list_display = ['upc', 'name']
    list_filter = ['home_locations__planogram', 'home_locations__planogram__store']


admin.site.register(models.Store)
admin.site.register(models.Planogram, PlanogramAdmin)
admin.site.register(models.HomeLocation, HomeLocationAdmin)
admin.site.register(models.Product, ProductAdmin)
