from rest_framework import serializers

from .models import HomeLocation, Product, Store


class StoreSerializer(serializers.ModelSerializer[Store]):
    class Meta:
        model = Store
        fields = ["id", "name"]


class HomeLocationSerializer(serializers.ModelSerializer[HomeLocation]):
    planogram = serializers.SerializerMethodField()

    def get_planogram(self, home_location: HomeLocation) -> str:
        # return home_location.planogram.name
        return str(home_location.planogram)

    class Meta:
        model = HomeLocation
        fields = ["name", "planogram"]


class ProductSerializer(serializers.ModelSerializer[Product]):
    class Meta:
        model = Product
        fields = ["upc", "name"]


class HomeLocation_Products_Serializer(serializers.ModelSerializer[HomeLocation]):
    products = ProductSerializer(many=True)

    class Meta:
        model = HomeLocation
