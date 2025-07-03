from rest_framework import serializers

from products.models import BrandParentCompany, Product, ProductAddition


class BasicBrandParentCompany(serializers.ModelSerializer[BrandParentCompany]):
    class Meta:
        model = BrandParentCompany
        fields = ("short_name", "expanded_name")
        read_only_fields = ("short_name", "expanded_name")


class BasicProduct(serializers.ModelSerializer[Product]):
    parent_company = BasicBrandParentCompany()

    class Meta:
        model = Product
        fields = ("upc", "name", "parent_company")
        read_only_fields = ("upc", "name", "parent_company")


class BasicProductAddition(serializers.ModelSerializer[ProductAddition]):
    product = BasicProduct()

    class Meta:
        model = ProductAddition
        fields = ("id", "date_last_scanned", "is_carried", "product")
