from . import models
from rest_framework import serializers


class StoreSerializer(serializers.ModelSerializer[models.Store]):
    class Meta:
        model = models.Store
        fields = ["id", "name"]


class HomeLocationSerializer(serializers.ModelSerializer[models.HomeLocation]):
    planogram = serializers.SerializerMethodField()

    def get_planogram(self, home_location: models.HomeLocation) -> str:
        # return home_location.planogram.name
        return str(home_location.planogram)

    class Meta:
        model = models.HomeLocation
        fields = ["name", "planogram"]


class ProductSerializer(serializers.ModelSerializer[models.Product]):
    class Meta:
        model = models.Product
        fields = ["upc", "name"]


class HomeLocation_Products_Serializer(serializers.ModelSerializer[models.HomeLocation]):
    products = ProductSerializer(many=True)

    class Meta:
        model = models.HomeLocation
        fields = ["name", "products"]
