from django.contrib import admin
from . import models


class FieldRepresentativeAdmin(admin.ModelAdmin):
    list_display = ['name', 'work_email']


class BrandParentCompanyAdmin(admin.ModelAdmin):
    list_display = ['short_name', 'expanded_name']


class ProductAdmin(admin.ModelAdmin):
    search_fields = ['upc', 'name']
    list_display = ['upc', 'name', 'parent_company']
    list_filter = ['parent_company']


class ProductAdditionAdmin(admin.ModelAdmin):
    search_fields = ['store__name', 'product__upc', 'product__name', 'added_date', 'is_carried']
    list_display = ['store', 'product', 'added_date', 'is_carried']


class StoreAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ['name', 'store_contact', 'get_field_representative']
    list_filter = ['field_representative__name']

    def get_field_representative(self, obj):
        if obj.field_representative is None:
            return '-'
        return obj.field_representative.name
    get_field_representative.admin_order_field = 'field_representative__name'
    get_field_representative.short_description = 'Field Rep'


# Register your models here.
admin.site.register(models.WorkCycle)
admin.site.register(models.FieldRepresentative, FieldRepresentativeAdmin)
admin.site.register(models.BrandParentCompany, BrandParentCompanyAdmin)
admin.site.register(models.Product, ProductAdmin)
admin.site.register(models.Store, StoreAdmin)
admin.site.register(models.ProductAddition, ProductAdditionAdmin)
admin.site.register(models.PersonnelContact)
