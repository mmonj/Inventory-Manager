from django.contrib import admin
from django.db import models
from django.http import HttpRequest
from django.urls import reverse
from django.utils.html import format_html

from .models import (
    BarcodeSheet,
    BrandParentCompany,
    FieldRepresentative,
    Message,
    MessageRecipient,
    MessageRecipientPushDelivery,
    PersonnelContact,
    PrefixMapping,
    Product,
    ProductAddition,
    PushSubscription,
    Store,
    StoreGUID,
    UpcCorrection,
    WorkCycle,
)


class FieldRepresentativeAdmin(admin.ModelAdmin[FieldRepresentative]):
    list_display = ("name", "work_email", "is_enabled")
    list_editable = ("is_enabled",)
    list_filter = ("is_enabled",)
    search_fields = ("name", "work_email")


class UpcCorrectionInline(admin.TabularInline[UpcCorrection, BrandParentCompany]):
    model = UpcCorrection
    extra = 1  # how many empty forms to show
    fields = ("bad_upc", "actual_upc")
    show_change_link = True


class PrefixMappingInline(admin.TabularInline[PrefixMapping, BrandParentCompany]):
    model = PrefixMapping
    extra = 1  # how many empty forms to show
    fields = ("product_name_regex", "prefix")
    show_change_link = True


class BrandParentCompanyAdmin(admin.ModelAdmin[BrandParentCompany]):
    list_display = (
        "short_name",
        "expanded_name",
        "canonical_name",
        "third_party_logo",
        "display_upc_prefixes",
    )
    inlines = (UpcCorrectionInline, PrefixMappingInline)

    def display_upc_prefixes(self, obj: BrandParentCompany) -> str:
        return ", ".join(obj.default_upc_prefixes or [])

    display_upc_prefixes.short_description = "UPC prefix digit(s)"  # type: ignore[attr-defined]


class ProductAdmin(admin.ModelAdmin[Product]):
    search_fields = ("upc", "name")
    list_display = ("upc", "name", "parent_company", "item_image", "date_added")
    list_filter = ("parent_company",)


class ProductAdditionAdmin(admin.ModelAdmin[ProductAddition]):
    search_fields = ("store__name", "product__upc", "product__name", "date_added")
    list_display = ("store", "product", "date_added", "date_last_scanned", "is_carried")


class StoreGuidAdmin(admin.ModelAdmin[StoreGUID]):
    search_fields = ("value",)
    list_display = ("value", "date_created", "stores_count")

    def get_queryset(self, request: HttpRequest) -> models.QuerySet[StoreGUID]:
        qs = super().get_queryset(request)
        return qs.annotate(models.Count("stores"))

    def stores_count(self, store_guid: StoreGUID) -> int:
        count: int = store_guid.stores__count  # type:ignore [attr-defined]
        return count

    stores_count.admin_order_field = "stores__count"  # type: ignore[attr-defined]


class StoreAdmin(admin.ModelAdmin[Store]):
    search_fields = ("name", "guid", "site_id")
    list_display = (
        "name",
        "date_created",
        "guid",
        "site_id",
        "get_personnel_contact_first_name",
        "get_personnel_contact_last_name",
        "get_field_representative",
    )
    list_filter = ("field_representative__name",)

    def get_personnel_contact_first_name(self, store: Store) -> str | None:
        contacts: models.QuerySet[PersonnelContact] = store.contacts.all()
        if not contacts:
            return None
        first_contact: PersonnelContact | None = contacts.first()
        if not first_contact:
            return None
        return first_contact.first_name

    def get_personnel_contact_last_name(self, store: Store) -> str | None:
        contacts: models.QuerySet[PersonnelContact] = store.contacts.all()
        if not contacts:
            return None

        first_contact: PersonnelContact | None = contacts.first()
        if not first_contact:
            return None

        return first_contact.last_name

    def get_field_representative(self, store: Store) -> str | None:
        if store.field_representative is None:
            return None
        return store.field_representative.name

    get_personnel_contact_first_name.admin_order_field = "contacts__first_name"  # type: ignore[attr-defined]
    get_personnel_contact_first_name.short_description = "Contact first name"  # type: ignore[attr-defined]

    get_personnel_contact_last_name.admin_order_field = "contacts__last_name"  # type: ignore[attr-defined]
    get_personnel_contact_last_name.short_description = "Contact last name"  # type: ignore[attr-defined]

    get_field_representative.admin_order_field = "field_representative__name"  # type: ignore[attr-defined]
    get_field_representative.short_description = "Field Rep"  # type: ignore[attr-defined]


class PersonnelContactAdmin(admin.ModelAdmin[PersonnelContact]):
    search_fields = ("first_name", "last_name", "store__name")
    autocomplete_fields = ("store",)
    list_display = ("first_name", "last_name", "store")
    list_filter = ("store__field_representative__name",)


class BarcodeSheetAdmin(admin.ModelAdmin[BarcodeSheet]):
    search_fields = ("store__name", "parent_company__short_name")
    list_display = ("store", "parent_company", "work_cycle", "num_product_additions", "upcs_hash")
    list_filter = ("parent_company__short_name", "work_cycle")
    readonly_fields = ("display_product_additions",)
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "store",
                    "parent_company",
                    "work_cycle",
                    "upcs_hash",
                    "upcs_list",
                    "datetime_created",
                )
            },
        ),
        ("Product Additions", {"fields": ("display_product_additions",)}),
    )

    def num_product_additions(self, barcode_sheet: BarcodeSheet) -> int:
        return barcode_sheet.product_additions.count()

    def display_product_additions(self, obj: BarcodeSheet) -> str:
        links: list[str] = []
        for addition in obj.product_additions.all():
            url = reverse("admin:products_product_change", args=[addition.product.id])
            links.append(format_html('<a href="{}">{}</a>', url, addition.product))
        return format_html("<br>".join(links)) if links else "No products"

    display_product_additions.short_description = "Product Additions"  # type: ignore[attr-defined]


class MessageRecipientInline(admin.TabularInline[MessageRecipient, Message]):
    model = MessageRecipient
    extra = 1
    fields = ("user", "is_read", "read_at")
    readonly_fields = ("read_at",)


class MessageAdmin(admin.ModelAdmin[Message]):
    search_fields = ("sender__username", "title", "body_md")
    list_display = ("sender", "title", "datetime_created", "num_recipients")
    inlines = (MessageRecipientInline,)

    def num_recipients(self, message: Message) -> int:
        return message.recipient_links.count()


class MessageRecipientAdmin(admin.ModelAdmin[MessageRecipient]):
    search_fields = ("user__username", "message__title")
    list_display = ("user", "message", "is_read", "read_at")
    list_filter = ("is_read",)
    autocomplete_fields = ("user", "message")


class PushSubscriptionAdmin(admin.ModelAdmin[PushSubscription]):
    search_fields = ("user__username", "endpoint")
    list_display = ("user", "endpoint", "datetime_created")


class MessageRecipientPushDeliveryAdmin(admin.ModelAdmin[MessageRecipientPushDelivery]):
    search_fields = ("message_recipient__user__username", "message_recipient__message__title")
    list_display = (
        "message_recipient",
        "push_subscription",
        "delivered_at",
        "failed_at",
    )
    list_filter = ("delivered_at", "failed_at")
    autocomplete_fields = ("message_recipient", "push_subscription")


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
admin.site.register(Message, MessageAdmin)
admin.site.register(MessageRecipient, MessageRecipientAdmin)
admin.site.register(PushSubscription, PushSubscriptionAdmin)
admin.site.register(MessageRecipientPushDelivery, MessageRecipientPushDeliveryAdmin)
