from typing import Optional
import barcode
import base64
import io

from rest_framework import serializers
from django.templatetags.static import static

from products.models import (
    BarcodeSheet,
    BrandParentCompany,
    Product,
    ProductAddition,
    Store,
    FieldRepresentative,
    PersonnelContact,
)


class BrandParentCompanySerializer(serializers.ModelSerializer[BrandParentCompany]):
    third_party_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = BrandParentCompany
        fields = ["short_name", "third_party_logo_url"]
        read_only_fields = ["short_name", "third_party_logo_url"]

    def get_third_party_logo_url(self, parent_company: BrandParentCompany) -> str:
        return parent_company.third_party_logo.url


class StoreSerializer(serializers.ModelSerializer[Store]):
    class Meta:
        model = Store
        fields = ["id", "name"]


class FieldRepresentativeSerializer(serializers.ModelSerializer[FieldRepresentative]):
    stores = StoreSerializer(many=True)

    class Meta:
        model = FieldRepresentative
        fields = ["id", "name", "stores"]


class ContactSerializer(serializers.ModelSerializer[PersonnelContact]):
    class Meta:
        model = PersonnelContact
        fields = ["id", "first_name", "last_name"]


class StoresManagersSerializer(serializers.ModelSerializer[Store]):
    contacts = ContactSerializer(many=True)

    class Meta:
        model = Store
        fields = ["id", "name", "contacts"]


class FieldRepresentativeStoresManagersSerializer(serializers.ModelSerializer[FieldRepresentative]):
    stores = StoresManagersSerializer(many=True)

    class Meta:
        model = FieldRepresentative
        fields = ["id", "name", "stores"]


class ProductSerializer(serializers.ModelSerializer[Product]):
    barcode_b64 = serializers.SerializerMethodField()
    item_image_url = serializers.SerializerMethodField()
    upc_sections = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["upc", "name", "upc_sections", "item_image_url", "barcode_b64"]
        read_only_fields = ["upc", "name", "upc_sections", "item_image_url", "barcode_b64"]

    def get_upc_sections(self, product: Product) -> list[str]:
        upc_sections = []

        upc_sections.append(product.upc[:1])
        upc_sections.append(product.upc[1:6])
        upc_sections.append(product.upc[6:11])
        upc_sections.append(product.upc[-1])

        return upc_sections

    def get_item_image_url(self, product: Product):
        if not product.item_image:
            return static("public/logger/images/image_not_available.png")
        return product.item_image.url

    def get_barcode_b64(self, product: Product) -> str:
        writer_options = {
            "module_height": 18,
            "font_size": 10,
            "text_distance": 4.0,
            "write_text": False,
            "background": "#ffffff",
        }

        barcode_instance = barcode.get("upc", product.upc, writer=barcode.writer.ImageWriter())
        temp_barcode_image = barcode_instance.render(writer_options=writer_options)

        fp = io.BytesIO()
        temp_barcode_image.save(fp, format="PNG")

        return base64.b64encode(fp.getvalue()).decode()


class ProductAdditionSerializer(serializers.ModelSerializer[ProductAddition]):
    is_new = serializers.SerializerMethodField()
    product = ProductSerializer()

    class Meta:
        model = ProductAddition
        fields = ["id", "product", "is_carried", "is_new"]
        read_only_fields = ["id", "product", "is_carried", "is_new"]

    def get_is_new(self, product_addition: ProductAddition) -> bool:
        # could not return single comparison expression result: mypy complained it would return Any
        if (
            self.context["work_cycle"].start_date <= product_addition.date_added
            and product_addition.date_added <= self.context["work_cycle"].end_date
        ):
            return True
        return False


class BarcodeSheetSerializer(serializers.ModelSerializer[BarcodeSheet]):
    store_name = serializers.SerializerMethodField()
    product_additions = ProductAdditionSerializer(many=True)
    parent_company = BrandParentCompanySerializer()
    barcode_sheet_id = serializers.SerializerMethodField()

    class Meta:
        model = BarcodeSheet
        fields = ["barcode_sheet_id", "store_name", "parent_company", "product_additions"]
        read_only_fields = ["barcode_sheet_id", "store_name", "parent_company", "product_additions"]

    def get_barcode_sheet_id(self, barcode_sheet: BarcodeSheet) -> int:
        return barcode_sheet.id

    def get_store_name(self, barcode_sheet: BarcodeSheet) -> Optional[str]:
        return barcode_sheet.store.name
