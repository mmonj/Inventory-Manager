import barcode
import base64
import io

from rest_framework import serializers
from django.templatetags.static import static

from products import models


class BrandParentCompanySerializer(serializers.ModelSerializer):
    third_party_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = models.BrandParentCompany
        fields = ["short_name", "third_party_logo_url"]
        read_only_fields = ["short_name", "third_party_logo_url"]

    def get_third_party_logo_url(self, parent_company: models.BrandParentCompany) -> str:
        return parent_company.third_party_logo.url


class ProductSerializer(serializers.ModelSerializer):
    barcode_b64 = serializers.SerializerMethodField()
    item_image_url = serializers.SerializerMethodField()
    upc_sections = serializers.SerializerMethodField()

    class Meta:
        model = models.Product
        fields = ['upc', 'name', 'upc_sections', 'item_image_url', 'barcode_b64']
        read_only_fields = ['upc', 'name', 'upc_sections', 'item_image_url', 'barcode_b64']

    def get_upc_sections(self, product):
        upc_sections = []

        upc_sections.append(product.upc[:1])
        upc_sections.append(product.upc[1:6])
        upc_sections.append(product.upc[6:11])
        upc_sections.append(product.upc[-1])

        return upc_sections

    def get_item_image_url(self, product):
        if not product.item_image:
            return static("products/images/image_not_available.png")
        return product.item_image.url

    def get_barcode_b64(self, product):
        writer_options = {
            'module_height': 18,
            'font_size': 10,
            'text_distance': 4.0,
            'write_text': False,
            'background': '#ffffff'
        }

        barcode_instance = barcode.get('upc', product.upc, writer=barcode.writer.ImageWriter())
        temp_barcode_image = barcode_instance.render(writer_options=writer_options)

        fp = io.BytesIO()
        temp_barcode_image.save(fp, format='PNG')

        return base64.b64encode(fp.getvalue()).decode()


class ProductAdditionSerializer(serializers.ModelSerializer):
    is_new = serializers.SerializerMethodField()
    product = ProductSerializer()

    class Meta:
        model = models.ProductAddition
        fields = ['id', 'product', 'is_carried', 'is_new']
        read_only_fields = ['id', 'product', 'is_carried', 'is_new']

    def get_is_new(self, product_addition) -> bool:
        return (self.context['work_cycle'].start_date <= product_addition.date_added
                and product_addition.date_added <= self.context['work_cycle'].end_date)


class BarcodeSheetSerializer(serializers.ModelSerializer):
    store_name = serializers.SerializerMethodField()
    product_additions = ProductAdditionSerializer(many=True)
    parent_company = BrandParentCompanySerializer()
    barcode_sheet_id = serializers.SerializerMethodField()
    date_created = serializers.SerializerMethodField()

    class Meta:
        model = models.BarcodeSheet
        fields = ["barcode_sheet_id", "store_name", "parent_company", "product_additions", "date_created"]
        read_only_fields = ["barcode_sheet_id", "store_name", "parent_company", "product_additions", "date_created"]

    def get_barcode_sheet_id(self, barcode_sheet: models.BarcodeSheet):
        return barcode_sheet.id

    def get_store_name(self, barcode_sheet: models.BarcodeSheet):
        return barcode_sheet.store.name

    def get_date_created(self, barcode_sheet: models.BarcodeSheet):
        return barcode_sheet.datetime_created.date()
