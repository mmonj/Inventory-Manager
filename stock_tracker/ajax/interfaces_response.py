from rest_framework import serializers

from products.models import (
    BarcodeSheet,
    BrandParentCompany,
    Product,
    ProductAddition,
    Store,
    WorkCycle,
)


class BasicBrandParentCompany(serializers.ModelSerializer[BrandParentCompany]):
    class Meta:
        model = BrandParentCompany
        fields = ["short_name", "expanded_name"]
        read_only_fields = ["short_name", "expanded_name"]


class BasicProduct(serializers.ModelSerializer[Product]):
    parent_company = BasicBrandParentCompany()

    class Meta:
        model = Product
        fields = ["upc", "name", "parent_company"]
        read_only_fields = ["upc", "name", "parent_company"]


class BasicProductAddition(serializers.ModelSerializer[ProductAddition]):
    product = BasicProduct()

    class Meta:
        model = ProductAddition
        fields = ["id", "date_last_scanned", "is_carried", "product"]


class BasicStore(serializers.ModelSerializer[Store]):
    class Meta:
        model = Store
        fields = ["name"]
        read_only_fields = ["name"]


class BasicWorkCycle(serializers.ModelSerializer[WorkCycle]):
    class Meta:
        model = WorkCycle
        fields = ["start_date"]
        read_only_fields = ["start_date"]


class BasicBarcodeSheet(serializers.ModelSerializer[BarcodeSheet]):
    store = BasicStore()
    parent_company = BasicBrandParentCompany(allow_null=True)
    work_cycle = BasicWorkCycle(allow_null=True)
    product_additions_count = serializers.SerializerMethodField()

    class Meta:
        model = BarcodeSheet
        fields = [
            "id",
            "store",
            "parent_company",
            "work_cycle",
            "datetime_created",
            "product_additions_count",
        ]
        read_only_fields = fields

    def get_product_additions_count(self, barcode_sheet: BarcodeSheet) -> int:
        return barcode_sheet.product_additions.count()
