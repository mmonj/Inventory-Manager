from rest_framework import serializers

from ..models import HomeLocation, Planogram, Product, ProductScanAudit


class PlanogramSerializer(serializers.ModelSerializer[Planogram]):
    class Meta:
        model = Planogram
        fields = ["pk", "name", "date_start", "date_end", "horizontal_section_thresholds"]


class ProductBasicInfoSerializer(serializers.ModelSerializer[Product]):
    class Meta:
        model = Product
        fields = ["upc", "name"]


class HomeLocationProductsSerializer(serializers.ModelSerializer[HomeLocation]):
    products = ProductBasicInfoSerializer(many=True)

    class Meta:
        model = HomeLocation
        fields = ["name", "products"]


class ProductBasicSerializer(serializers.ModelSerializer[Product]):
    class Meta:
        model = Product
        fields = ["id", "upc", "name", "date_created"]


class ScanAuditSerializer(serializers.ModelSerializer[ProductScanAudit]):
    products_in_stock = ProductBasicSerializer(many=True)

    class Meta:
        model = ProductScanAudit
        fields = ["id", "product_type", "datetime_created", "products_in_stock"]
