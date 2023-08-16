from products.models import BrandParentCompany, Product, ProductAddition
from rest_framework import serializers
from django_typomatic import ts_interface, generate_ts  # type: ignore [import, unused-ignore]


@ts_interface()
class BasicBrandParentCompany(serializers.ModelSerializer[BrandParentCompany]):
    class Meta:
        model = BrandParentCompany
        fields = ["short_name", "expanded_name"]
        read_only_fields = ["short_name", "expanded_name"]


@ts_interface()
class BasicProduct(serializers.ModelSerializer[Product]):
    parent_company = BasicBrandParentCompany()

    class Meta:
        model = Product
        fields = ["upc", "name", "parent_company"]
        read_only_fields = ["upc", "name", "parent_company"]


@ts_interface()
class BasicProductAddition(serializers.ModelSerializer[ProductAddition]):
    product = BasicProduct()

    class Meta:
        model = ProductAddition
        fields = ["id", "date_last_scanned", "is_carried", "product"]


generate_ts("./client/util/stockTracker/apiInterfaces.ts")
