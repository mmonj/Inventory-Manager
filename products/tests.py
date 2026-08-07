from typing import Any

from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase
from django.utils import timezone

from . import models


def printdebug(*items: Any) -> None:
    print()
    for item in items:
        print(f"    > Type: {type(item)} -> {item._strd()}")  # noqa: SLF001 -- debug-only helper


# Create your tests here.
class FieldRepresentativeTest(TestCase):
    def setUp(self) -> None:
        models.FieldRepresentative.objects.create(name="jon1", work_email="jondoe1@gmail.com")

        rep2 = models.FieldRepresentative(name="jon2", work_email="jondoe2")
        self.assertRaises(ValidationError, rep2.save)

    def test_create(self) -> None:
        rep1 = models.FieldRepresentative.objects.get(name="jon1")
        printdebug(rep1)


class BrandParentCompanyTest(TestCase):
    def setUp(self) -> None:
        models.BrandParentCompany.objects.create(short_name="CLRX", expanded_name="Clorox")

    def test_create(self) -> None:
        company1 = models.BrandParentCompany.objects.get(short_name="CLRX")
        printdebug(company1)


class ProductTest(TestCase):
    def setUp(self) -> None:
        models.Product.objects.create(upc="190198131553")  # valid upc

    def test_attributes(self) -> None:
        product1 = models.Product.objects.get(upc="190198131553")
        printdebug(product1)

        self.assertIsNone(product1.name)
        self.assertIsNone(product1.parent_company)

        product1.name = "test product name"
        product1.save(update_fields=["name"])
        self.assertIsNotNone(product1.name)

        printdebug(product1)

        company1 = models.BrandParentCompany.objects.create(
            short_name="CLRX", expanded_name="Clorox"
        )
        product1.parent_company = company1
        product1.save(update_fields=["parent_company"])
        self.assertIsNotNone(product1.parent_company)

        printdebug(product1)

    def test_invalid_upc(self) -> None:
        # invalid upc: too short
        self.assertRaises(ValidationError, models.Product.objects.create, upc="1234")
        # invalid upc: correct length, check digit is invalid
        self.assertRaises(ValidationError, models.Product.objects.create, upc="012345678999")

    def test_duplicate(self) -> None:
        new_product = models.Product(upc="190198131553")
        self.assertRaises(ValidationError, new_product.save)


class PersonnelContactTest(TestCase):
    def setUp(self) -> None:
        models.PersonnelContact.objects.create(first_name="first1")

    def test_attributes(self) -> None:
        contact1 = models.PersonnelContact.objects.get(first_name="first1")
        printdebug(contact1)


class ProductAdditionTest(TestCase):
    def setUp(self) -> None:
        store1 = models.Store.objects.create(name="store11-name")
        product1 = models.Product.objects.create(upc="044600320649")

        models.ProductAddition.objects.create(store=store1, product=product1)

    def test_attributes(self) -> None:
        store1 = models.Store.objects.get(name="store11-name")
        product1 = models.Product.objects.get(upc="044600320649")

        product_addition = models.ProductAddition.objects.get(store=store1, product=product1)
        self.assertEqual(product_addition.date_added, timezone.now().date())
        self.assertEqual(product_addition.is_carried, False)

    def test_duplicates(self) -> None:
        store1 = models.Store.objects.get(name="store11-name")
        product1 = models.Product.objects.get(upc="044600320649")

        product_addition = models.ProductAddition(store=store1, product=product1, is_carried=True)
        self.assertRaises(IntegrityError, product_addition.save)
