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
        fields = ['product', 'is_carried']


class PersonnelContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PersonnelContact
        fields = ['first_name', 'last_name']


class StoreSerializer(serializers.ModelSerializer):
    contacts = PersonnelContactSerializer(many=True)
    class Meta:
        model = models.Store
        fields = ['name', 'contacts']
