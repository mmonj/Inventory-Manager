import datetime
from rest_framework import serializers
from products.models import (
    Product,
    ProductAddition,
    FieldRepresentative,
    PersonnelContact,
    Store,
    BarcodeSheet,
    WorkCycle,
)


class ProductSerializer(serializers.ModelSerializer[Product]):
    class Meta:
        model = Product
        fields = ["upc", "name"]


class ProductAdditionSerializer(serializers.ModelSerializer[ProductAddition]):
    is_new = serializers.SerializerMethodField(read_only=True)
    product = ProductSerializer()

    class Meta:
        model = ProductAddition
        fields = ["product", "is_carried", "is_new"]

    def get_is_new(self, product_addition: ProductAddition) -> bool:
        work_cycle: WorkCycle = self.context["work_cycle"]
        return (
            work_cycle.start_date <= product_addition.date_added
            and product_addition.date_added <= work_cycle.end_date
        )


class PersonnelContactSerializer(serializers.ModelSerializer[PersonnelContact]):
    class Meta:
        model = PersonnelContact
        fields = ["first_name", "last_name"]


class FieldRepresentativeSerializer(serializers.ModelSerializer[FieldRepresentative]):
    class Meta:
        model = FieldRepresentative
        fields = ["id", "name", "work_email"]


class StoreSerializer(serializers.ModelSerializer[Store]):
    contacts = PersonnelContactSerializer(many=True)
    field_representative = FieldRepresentativeSerializer()

    class Meta:
        model = Store
        fields = ["id", "name", "contacts", "field_representative"]


class BarcodeSheetSerializer(serializers.ModelSerializer[BarcodeSheet]):
    store = StoreSerializer()
    product_additions = ProductAdditionSerializer(many=True)
    barcode_sheet_id = serializers.SerializerMethodField()
    date_created = serializers.SerializerMethodField()

    class Meta:
        model = BarcodeSheet
        fields = [
            "barcode_sheet_id",
            "store",
            "parent_company",
            "product_additions",
            "date_created",
        ]
        read_only_fields = [
            "barcode_sheet_id",
            "store",
            "parent_company",
            "product_additions",
            "date_created",
        ]

    def get_barcode_sheet_id(self, barcode_sheet: BarcodeSheet) -> int:
        return barcode_sheet.id

    def get_date_created(self, barcode_sheet: BarcodeSheet) -> datetime.date:
        datetime_created: datetime.datetime = barcode_sheet.datetime_created
        return datetime_created.date()
