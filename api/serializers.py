from typing import Optional

import cattrs
from rest_framework import serializers

from products.models import (
    BarcodeSheet,
    FieldRepresentative,
    PersonnelContact,
    Product,
    ProductAddition,
    Store,
    WorkCycle,
)
from products.util import get_num_work_cycles_offset
from survey_worker.qtrax.models import QtStoreJobLink


class ProductSerializer(serializers.ModelSerializer[Product]):
    raw_upc = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = ("upc", "name", "raw_upc")
        read_only_fields = ("upc", "name", "raw_upc")

    def get_raw_upc(self, product: Product) -> str:
        upc_to_raw_upcs_map = self.context["upc_to_raw_upcs_map"]
        return upc_to_raw_upcs_map[product.upc]  # type: ignore [no-any-return]


class ProductAdditionSerializer(serializers.ModelSerializer[ProductAddition]):
    is_new = serializers.SerializerMethodField(read_only=True)
    num_work_cycles_since_order = serializers.SerializerMethodField(read_only=True)
    product = ProductSerializer()

    class Meta:
        model = ProductAddition
        fields = ("product", "is_carried", "is_new", "num_work_cycles_since_order")

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
        fields = ("id", "first_name", "last_name")


class FieldRepresentativeSerializer(serializers.ModelSerializer[FieldRepresentative]):
    class Meta:
        model = FieldRepresentative
        fields = ("id", "name", "work_email")


class StoreSerializer(serializers.ModelSerializer[Store]):
    contacts = PersonnelContactSerializer(many=True)

    class Meta:
        model = Store
        fields = ("id", "name", "contacts")


class ServiceOrderSerializer(serializers.ModelSerializer[QtStoreJobLink]):
    store = StoreSerializer()
    estimated_time = serializers.SerializerMethodField()

    class Meta:
        model = QtStoreJobLink
        fields = ("estimated_time", "store")
        read_only_fields = ("estimated_time", "store")

    def get_estimated_time(self, _job: QtStoreJobLink) -> float:
        return cattrs.structure(self.context["estimated_time"], float)


class BarcodeSheetSerializer(serializers.ModelSerializer[BarcodeSheet]):
    product_additions = ProductAdditionSerializer(many=True)
    barcode_sheet_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BarcodeSheet
        fields = (
            "barcode_sheet_id",
            "datetime_created",
            "product_additions",
        )
        read_only_fields = (
            "barcode_sheet_id",
            "datetime_created",
            "product_additions",
        )

    def get_barcode_sheet_id(self, barcode_sheet: Optional[BarcodeSheet]) -> Optional[int]:
        if barcode_sheet is None:
            return None
        return barcode_sheet.id
