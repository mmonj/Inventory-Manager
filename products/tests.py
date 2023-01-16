from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase
from . import helpers
from . import models

def printdebug(*items):
    print('')
    for item in items:
        print(f'    > Type: {type(item)} -> {item._strd()}')

# Create your tests here.
class FieldRepresentativeTest(TestCase):
    def setUp(self) -> None:
        rep1 = models.FieldRepresentative.objects.create(name='jon1', work_email='jondoe1@gmail.com')

        rep2 = models.FieldRepresentative(name='jon2', work_email='jondoe2')
        self.assertRaises(ValidationError, rep2.save)
    
    def test_create(self):
        rep1 = models.FieldRepresentative.objects.get(name='jon1')
        printdebug(rep1)


class BrandParentCompanyTest(TestCase):
    def setUp(self) -> None:
        company1 = models.BrandParentCompany.objects.create(short_name='CLRX', expanded_name='Clorox')

    def test_create(self):
        company1 = models.BrandParentCompany.objects.get(short_name='CLRX')
        printdebug(company1)


class ProductTest(TestCase):
    def setUp(self) -> None:
        product1 = models.Product.objects.create(upc='190198131553')    # valid upc

    def test_attributes(self):
        product1 = models.Product.objects.get(upc='190198131553')
        printdebug(product1)

        self.assertIsNone(product1.name)
        self.assertIsNone(product1.parent_company)

        product1.name = 'test product name'
        product1.save(update_fields=['name'])
        self.assertIsNotNone(product1.name)

        printdebug(product1)

        company1 = models.BrandParentCompany.objects.create(short_name='CLRX', expanded_name='Clorox')
        product1.parent_company = company1
        product1.save(update_fields=['parent_company'])
        self.assertIsNotNone(product1.parent_company)

        printdebug(product1)

    def test_invalid_upc(self):
        # invalid upc: too short
        self.assertRaises(ValidationError, models.Product.objects.create, upc='1234')
        # invalid upc: correct length, check digit is invalid
        self.assertRaises(ValidationError, models.Product.objects.create, upc='012345678999')

    def test_duplicate(self):
        new_product = models.Product(upc='190198131553')
        self.assertRaises(ValidationError, new_product.save)


class PersonnelContactTest(TestCase):
    def setUp(self) -> None:
        contact1 = models.PersonnelContact.objects.create(first_name='first1')

    def test_attributes(self):
        contact1 = models.PersonnelContact.objects.get(first_name='first1')
        printdebug(contact1)


class StoreTest(TestCase):
    def setUp(self) -> None:
        store1 = models.Store.objects.create(name='store1-name')

        store_contact1 = models.PersonnelContact.objects.create(
            first_name='contact-first-name1', 
            last_name='contact-last-name1')
        store2 = models.Store.objects.create(name='store2-name', store_contact=store_contact1)

        store_contact2 = models.PersonnelContact.objects.create(
            first_name='contact-first-name2', 
            last_name='contact-last-name2')
        field_rep1 = models.FieldRepresentative.objects.create(name='fieldrep1', work_email='fieldrep1@gmail.com')
        store3 = models.Store.objects.create(
            name='store3-name', 
            store_contact=store_contact2, 
            field_representative=field_rep1)

    def test_attributes(self):
        store1 = models.Store.objects.get(name='store1-name')
        self.assertIsNone(store1.store_contact)
        self.assertIsNone(store1.field_representative)

        store2 = models.Store.objects.get(name='store2-name')
        self.assertIsNotNone(store2.store_contact)
        self.assertIsNone(store2.field_representative)

        store3 = models.Store.objects.get(name='store3-name')
        self.assertIsNotNone(store3.store_contact)
        self.assertIsNotNone(store3.field_representative)

    def test_duplicate(self):
        new_store = models.Store(name='store1-name')
        self.assertRaises(ValidationError, new_store.save)


class ProductAdditionTest(TestCase):
    def setUp(self) -> None:
        store1 = models.Store.objects.create(name='store11-name')
        product1 = models.Product.objects.create(upc='044600320649')

        product_addition = models.ProductAddition.objects.create(
            store=store1, 
            product=product1
        )

    def test_attributes(self):
        import datetime

        store1 = models.Store.objects.get(name='store11-name')
        product1 = models.Product.objects.get(upc='044600320649')

        product_addition = models.ProductAddition.objects.get(store=store1, product=product1)
        self.assertEqual(product_addition.date_added, datetime.date.today())
        self.assertEqual(product_addition.is_carried, False)

    def test_duplicates(self):
        store1 = models.Store.objects.get(name='store11-name')
        product1 = models.Product.objects.get(upc='044600320649')

        product_addition = models.ProductAddition(store=store1, product=product1, is_carried=True)
        self.assertRaises(IntegrityError, product_addition.save)


class ImportTest(TestCase):
    def setUp(self) -> None:
        self.import_dict = {
            "Mauri": [
                "test1_store",
                "test2_store",
                "test3_store"
            ], 
            "All Stores": {
                "test1_store": {
                    "manager_names": [
                        "jon",
                        "doe"
                    ]
                },
                "test2_store": {
                    "manager_names": [
                        "jon",
                        "doe"
                    ]
                }, 
                "test3_store": {
                    "manager_names": [
                        "first_3",
                        "last_3"
                    ]
                }
            }
        }

        models.Store.objects.create(name='test1_store')

        field_rep = models.FieldRepresentative.objects.create(name='Mauri', work_email='mauri@testmail.com')
        models.Store.objects.create(name='test2_store', field_representative=field_rep)

        personnel_contact = models.PersonnelContact.objects.create(first_name='randomfirst', last_name='randomlast')
        models.Store.objects.create(name='test3_store', store_contact=personnel_contact)


    def test_import(self):
        helpers.import_employee_stores(self.import_dict)
