from django.contrib import admin
from . import models


class FieldRepresentativeAdmin(admin.ModelAdmin):
    list_display = ['name', 'work_email']


class BrandParentCompanyAdmin(admin.ModelAdmin):
    list_display = ['short_name', 'expanded_name']


class ProductAdmin(admin.ModelAdmin):
    search_fields = ['upc', 'name']
    list_display = ['upc', 'name', 'parent_company', 'item_image']
    list_filter = ['parent_company']


class ProductAdditionAdmin(admin.ModelAdmin):
    search_fields = ['store__name', 'product__upc', 'product__name', 'date_added']
    list_display = ['store', 'product', 'date_added', 'date_last_scanned', 'is_carried']


class StoreAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ['name', 'get_field_representative']
    list_filter = ['field_representative__name']

    def get_field_representative(self, obj):
        if obj.field_representative is None:
            return None
        return obj.field_representative.name

    get_field_representative.admin_order_field = 'field_representative__name'
    get_field_representative.short_description = 'Field Rep'


class PersonnelContactAdmin(admin.ModelAdmin):
    search_fields = ['first_name', 'last_name', 'store__name']
    list_display = ['first_name', 'last_name', 'store']
    list_filter = ['store__field_representative__name']


# Register your models here.
admin.site.register(models.WorkCycle)
admin.site.register(models.FieldRepresentative, FieldRepresentativeAdmin)
admin.site.register(models.BrandParentCompany, BrandParentCompanyAdmin)
admin.site.register(models.Product, ProductAdmin)
admin.site.register(models.Store, StoreAdmin)
admin.site.register(models.ProductAddition, ProductAdditionAdmin)
admin.site.register(models.PersonnelContact, PersonnelContactAdmin)
