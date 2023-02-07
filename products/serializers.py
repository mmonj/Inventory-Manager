from rest_framework import serializers

from . import models


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Product
        fields = ['upc', 'name']
        
        
class ProductAdditionSerializer(serializers.ModelSerializer):
    is_new = serializers.SerializerMethodField(read_only=True)
    product = ProductSerializer()
    class Meta:
        model = models.ProductAddition
        fields = ['product', 'is_carried', 'is_new']
    
    def get_is_new(self, obj) -> bool:
        return self.context['current_work_cycle'].start_date <= obj.date_added and obj.date_added <= self.context['current_work_cycle'].end_date


class PersonnelContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PersonnelContact
        fields = ['first_name', 'last_name']


class StoreSerializer(serializers.ModelSerializer):
    contacts = PersonnelContactSerializer(many=True)
    class Meta:
        model = models.Store
        fields = ['name', 'contacts']
