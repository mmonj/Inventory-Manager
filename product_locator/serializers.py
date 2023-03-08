from . import models
from rest_framework import serializers


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Store
        fields = ["id", "name"]


class HomeLocationSerializer(serializers.ModelSerializer):
    planogram = serializers.SerializerMethodField()

    class Meta:
        model = models.HomeLocation
        fields = ["name", "planogram"]

    def get_planogram(self, home_location):
        return home_location.planogram.name
