from typing import Any

from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase

from . import models, util


def printdebug(*items: Any) -> None:
    print("")
    for item in items:
        print(f"    > Type: {type(item)} -> {item._strd()}")


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
        import datetime

        store1 = models.Store.objects.get(name="store11-name")
        product1 = models.Product.objects.get(upc="044600320649")

        product_addition = models.ProductAddition.objects.get(store=store1, product=product1)
        self.assertEqual(product_addition.date_added, datetime.date.today())
        self.assertEqual(product_addition.is_carried, False)

    def test_duplicates(self) -> None:
        store1 = models.Store.objects.get(name="store11-name")
        product1 = models.Product.objects.get(upc="044600320649")

        product_addition = models.ProductAddition(store=store1, product=product1, is_carried=True)
        self.assertRaises(IntegrityError, product_addition.save)


class ImportTest(TestCase):
    def setUp(self) -> None:
        self.territory_info = {
            "Mauri": ["test1_store", "test2_store", "test3_store"],
            "All Stores": {
                "test1_store": {"manager_names": ["jon", "doe"]},
                "test2_store": {"manager_names": ["jon", "doe"]},
                "test3_store": {"manager_names": ["first_3", "last_3"]},
            },
        }

        self.store_distribution_data = {
            "test1_store": {
                "851035003319": {
                    "time_added": 1660073557.2510889,
                    "instock": True,
                    "date_scanned": "2022-08-09 at 03:32:37 PM",
                },
                "851035003227": {"instock": True, "date_scanned": "2022-08-09 at 03:32:33 PM"},
                "851035003562": {"instock": False},
            },
            "test2_store": {
                "044600016283": {"instock": True, "date_scanned": "2022-12-12 at 03:45:36 AM"},
                "044600600444": {"instock": True, "date_scanned": "2022-12-12 at 03:45:44 AM"},
                "044600309002": {
                    "time_added": 1660721937.862297,
                    "instock": False,
                    "date_scanned": "2022-08-17 at 03:38:57 AM",
                },
            },
            "test3_store": {
                "078041189886": {"instock": True, "date_scanned": "2022-06-30 at 03:15:23 PM"},
                "078041143215": {"instock": True, "date_scanned": "2022-06-30 at 03:15:27 PM"},
                "044600601557": {"instock": False},
                "044600601564": {
                    "time_added": 1674370881.578151,
                    "instock": False,
                    "date_scanned": "2023-01-22 at 03:01:21 AM",
                },
            },
        }

        self.products_info = {
            "BRAND1": {
                "851035003319": {"fs_name": "BRAND1-item-description1"},
                "851035003227": {"fs_name": "BRAND1-item-description2"},
            },
            "BRAND2": {
                "041953075059": {"fs_name": "BRAND2-item-description1"},
                "041953075066": {"fs_name": "BRAND2-item-description2"},
            },
            "BRAND3": {
                "036000514711": {"fs_name": "BRAND3-item-description1"},
                "036000514728": {"fs_name": "BRAND3-item-description2"},
                "036000514735": {"fs_name": "BRAND3-item-description3"},
            },
        }

    def test_bulk_import(self) -> None:
        from .import_testfiles import testfiles_handler

        field_reps_info = testfiles_handler.get_field_reps_info()
        territory_info = testfiles_handler.get_territory_info()
        products_info = testfiles_handler.get_products_info()
        stores_distribution_data = testfiles_handler.get_store_distribution_data()

        util.import_field_reps(field_reps_info)
        util.import_territories(territory_info)
        util.import_products(products_info)
        util.import_distribution_data(stores_distribution_data)

        self.assertEqual(models.FieldRepresentative.objects.count(), len(field_reps_info))
        self.assertEqual(models.Store.objects.count(), util.get_store_count(territory_info))

        stores_managers_dict = util.get_stores_managers_dict(territory_info)
        self.assertEqual(models.PersonnelContact.objects.count(), len(stores_managers_dict))

        self.assertEqual(
            models.Product.objects.count(),
            util.get_product_count(products_info, stores_distribution_data),
        )

        product_additions_count = util.get_product_additions_count(stores_distribution_data)
        self.assertEqual(models.ProductAddition.objects.count(), product_additions_count)

    def test_import_territories(self) -> None:
        models.Store.objects.create(name="test1_store")

        field_rep = models.FieldRepresentative.objects.create(
            name="Mauri", work_email="mauri@testmail.com"
        )
        store1 = models.Store.objects.create(name="test2_store", field_representative=field_rep)

        models.PersonnelContact.objects.create(
            first_name="randomfirst", last_name="randomlast", store=store1
        )
        models.Store.objects.create(name="test3_store")

        util.import_territories(self.territory_info)

    def test_import_products(self) -> None:
        util.import_products(self.products_info)  # type: ignore [arg-type]

        for parent_company, products in self.products_info.items():
            is_company_exist = models.BrandParentCompany.objects.filter(
                short_name=parent_company
            ).exists()
            self.assertTrue(is_company_exist)
            for upc, info in products.items():
                is_product_exist = models.Product.objects.filter(upc=upc).exists()
                self.assertTrue(is_product_exist)

    def test_import_distribution_data(self) -> None:
        util.import_distribution_data(self.store_distribution_data)  # type: ignore [arg-type]

        for store_name, products in self.store_distribution_data.items():
            store = models.Store.objects.get(name=store_name)

            for upc, distribution_data in products.items():  # type: ignore[attr-defined]
                product = models.Product.objects.get(upc=upc)
                is_product_addition_exist = models.ProductAddition.objects.filter(
                    product=product, store=store
                ).exists()
                self.assertTrue(is_product_addition_exist)
