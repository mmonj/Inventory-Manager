from rest_framework import serializers

from ..models import HomeLocation, Planogram, Product, ProductScanAudit, Store


class StoreSerializer(serializers.ModelSerializer[Store]):
    class Meta:
        model = Store
        fields = ["id", "name"]


class PlanogramSerializer(serializers.ModelSerializer[Planogram]):
    class Meta:
        model = Planogram
        fields = ["pk", "name", "date_start", "date_end"]


class HomeLocationSerializer(serializers.ModelSerializer[HomeLocation]):
    planogram = PlanogramSerializer()

    class Meta:
        model = HomeLocation
        fields = ["pk", "name", "planogram"]


class ProductWithHomeLocationsSerializer(serializers.ModelSerializer[Product]):
    home_locations = HomeLocationSerializer(many=True)

    class Meta:
        model = Product
        fields = ["upc", "name", "home_locations"]


class HomeLocation_Products_Serializer(serializers.ModelSerializer[HomeLocation]):
    products = ProductWithHomeLocationsSerializer(many=True)

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
