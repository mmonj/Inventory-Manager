from rest_framework import serializers
from products import models


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

    def get_is_new(self, product_addition) -> bool:
        return (self.context['work_cycle'].start_date <= product_addition.date_added
                and product_addition.date_added <= self.context['work_cycle'].end_date)


class PersonnelContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PersonnelContact
        fields = ['first_name', 'last_name']


class StoreSerializer(serializers.ModelSerializer):
    contacts = PersonnelContactSerializer(many=True)

    class Meta:
        model = models.Store
        fields = ['id', 'name', 'contacts']


class BarcodeSheetSerializer(serializers.ModelSerializer):
    store = StoreSerializer()
    product_additions = ProductAdditionSerializer(many=True)
    barcode_sheet_id = serializers.SerializerMethodField()
    date_created = serializers.SerializerMethodField()

    class Meta:
        model = models.BarcodeSheet
        fields = ["barcode_sheet_id", "store", "parent_company", "product_additions", "date_created"]
        read_only_fields = ["barcode_sheet_id", "store", "parent_company", "product_additions", "date_created"]

    def get_barcode_sheet_id(self, barcode_sheet: models.BarcodeSheet):
        return barcode_sheet.id

    def get_date_created(self, barcode_sheet: models.BarcodeSheet):
        return barcode_sheet.datetime_created.date()
