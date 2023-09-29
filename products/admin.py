from typing import Optional

from django.contrib import admin
from django.db import models
from django.http import HttpRequest
from django_stubs_ext import QuerySetAny

from .models import (
    BarcodeSheet,
    BrandParentCompany,
    FieldRepresentative,
    PersonnelContact,
    Product,
    ProductAddition,
    Store,
    StoreGUID,
    WorkCycle,
)


class FieldRepresentativeAdmin(admin.ModelAdmin[FieldRepresentative]):
    list_display = ["name", "work_email"]


class BrandParentCompanyAdmin(admin.ModelAdmin[BrandParentCompany]):
    list_display = ["short_name", "expanded_name", "third_party_logo"]


class ProductAdmin(admin.ModelAdmin[Product]):
    search_fields = ["upc", "name"]
    list_display = ["upc", "name", "parent_company", "item_image", "date_added"]
    list_filter = ["parent_company"]


class ProductAdditionAdmin(admin.ModelAdmin[ProductAddition]):
    search_fields = ["store__name", "product__upc", "product__name", "date_added"]
    list_display = ["store", "product", "date_added", "date_last_scanned", "is_carried"]


class StoreGuidAdmin(admin.ModelAdmin[StoreGUID]):
    search_fields = ["value"]
    list_display = ["value", "date_created", "stores_count"]

    def get_queryset(self, request: HttpRequest) -> QuerySetAny[StoreGUID, StoreGUID]:
        qs = super(StoreGuidAdmin, self).get_queryset(request)
        qs = qs.annotate(models.Count("stores"))
        return qs

    def stores_count(self, store_guid: StoreGUID) -> int:
        count: int = store_guid.stores__count  # type:ignore [attr-defined]
        return count

    setattr(stores_count, "admin_order_field", "stores__count")


class StoreAdmin(admin.ModelAdmin[Store]):
    search_fields = ["name", "guid"]
    list_display = [
        "name",
        "date_created",
        "guid",
        "get_personnel_contact_first_name",
        "get_personnel_contact_last_name",
        "get_field_representative",
    ]
    list_filter = ["field_representative__name"]

    def get_personnel_contact_first_name(self, store: Store) -> Optional[str]:
        contacts: QuerySetAny[PersonnelContact, PersonnelContact] = store.contacts.all()
        if not contacts:
            return None
        first_contact: Optional[PersonnelContact] = contacts.first()
        if not first_contact:
            return None
        return first_contact.first_name

    def get_personnel_contact_last_name(self, store: Store) -> Optional[str]:
        contacts: QuerySetAny[PersonnelContact, PersonnelContact] = store.contacts.all()
        if not contacts:
            return None

        first_contact: Optional[PersonnelContact] = contacts.first()
        if not first_contact:
            return None

        return first_contact.last_name

    def get_field_representative(self, store: Store) -> Optional[str]:
        if store.field_representative is None:
            return None
        return store.field_representative.name

    setattr(get_personnel_contact_first_name, "admin_order_field", "contacts__first_name")
    setattr(get_personnel_contact_first_name, "short_description", "Contact first name")

    setattr(get_personnel_contact_last_name, "admin_order_field", "contacts__last_name")
    setattr(get_personnel_contact_last_name, "short_description", "Contact last name")

    setattr(get_field_representative, "admin_order_field", "field_representative__name")
    setattr(get_field_representative, "short_description", "Field Rep")


class PersonnelContactAdmin(admin.ModelAdmin[PersonnelContact]):
    search_fields = ["first_name", "last_name", "store__name"]
    autocomplete_fields = ["store"]
    list_display = ["first_name", "last_name", "store"]
    list_filter = ["store__field_representative__name"]


class BarcodeSheetAdmin(admin.ModelAdmin[BarcodeSheet]):
    search_fields = ["store__name", "parent_company__short_name"]
    list_display = ["store", "parent_company", "work_cycle", "num_product_additions", "upcs_hash"]
    list_filter = ["parent_company__short_name", "work_cycle"]
    raw_id_fields = ["product_additions"]

    def num_product_additions(self, barcode_sheet: BarcodeSheet) -> int:
        return barcode_sheet.product_additions.count()


# Register your models here.
admin.site.register(WorkCycle)
admin.site.register(FieldRepresentative, FieldRepresentativeAdmin)
admin.site.register(BrandParentCompany, BrandParentCompanyAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(StoreGUID, StoreGuidAdmin)
admin.site.register(Store, StoreAdmin)
admin.site.register(ProductAddition, ProductAdditionAdmin)
admin.site.register(PersonnelContact, PersonnelContactAdmin)
admin.site.register(BarcodeSheet, BarcodeSheetAdmin)
