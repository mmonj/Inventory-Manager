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
