from typing import Optional
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
from products.util import get_num_work_cycles_offset


class ProductSerializer(serializers.ModelSerializer[Product]):
    class Meta:
        model = Product
        fields = ["upc", "name"]


class ProductAdditionSerializer(serializers.ModelSerializer[ProductAddition]):
    is_new = serializers.SerializerMethodField(read_only=True)
    num_work_cycles_since_order = serializers.SerializerMethodField(read_only=True)
    product = ProductSerializer()

    class Meta:
        model = ProductAddition
        fields = ["product", "is_carried", "is_new", "num_work_cycles_since_order"]

    def get_is_new(self, product_addition: ProductAddition) -> bool:
        work_cycle: WorkCycle = self.context["work_cycle"]
        return (
            work_cycle.start_date <= product_addition.date_added
            and product_addition.date_added <= work_cycle.end_date
        )

    def get_num_work_cycles_since_order(self, product_addition: ProductAddition) -> Optional[int]:
        if product_addition.date_ordered is None:
            return None

        return get_num_work_cycles_offset(product_addition.date_ordered, self.context["work_cycle"])


class PersonnelContactSerializer(serializers.ModelSerializer[PersonnelContact]):
    class Meta:
        model = PersonnelContact
        fields = ["id", "first_name", "last_name"]


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
    product_additions = ProductAdditionSerializer(many=True)
    barcode_sheet_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BarcodeSheet
        fields = [
            "barcode_sheet_id",
            "datetime_created",
            "product_additions",
        ]
        read_only_fields = [
            "barcode_sheet_id",
            "datetime_created",
            "product_additions",
        ]

    def get_barcode_sheet_id(self, barcode_sheet: BarcodeSheet) -> int:
        return barcode_sheet.pk
