from . import models
from rest_framework import serializers


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Store
        fields = ["id", "name"]
