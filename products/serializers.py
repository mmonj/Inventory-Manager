from rest_framework import serializers

from . import models


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Product
        fields = ['upc', 'name']
        
        
class ProductAdditionSerializer(serializers.ModelSerializer):
    product = ProductSerializer()
    class Meta:
        model = models.ProductAddition
        fields = ['product']
