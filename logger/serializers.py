import barcode
import base64
import io

from rest_framework import serializers
from django.templatetags.static import static

from products import models


class ProductSerializer(serializers.ModelSerializer):
    barcode_b64 = serializers.SerializerMethodField()
    item_image_url = serializers.SerializerMethodField()

    class Meta:
        model = models.Product
        fields = ['upc', 'name', 'item_image_url', 'barcode_b64']
        read_only_fields = ['upc', 'name', 'item_image_url', 'barcode_b64']

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
        return (self.context['current_work_cycle'].start_date <= product_addition.date_added
                and product_addition.date_added <= self.context['current_work_cycle'].end_date)
