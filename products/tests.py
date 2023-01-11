from django.core.exceptions import ValidationError
from django.test import TestCase
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

    def test_create(self):
        product1 = models.Product.objects.get(upc='190198131553')
        printdebug(product1)

        product1.name = 'test product name'
        product1.save(update_fields=['name'])
        printdebug(product1)

        company1 = models.BrandParentCompany.objects.create(short_name='CLRX', expanded_name='Clorox')
        product1.parent_company = company1
        product1.save(update_fields=['parent_company'])
        printdebug(product1)

    def test_validation_error(self):
        # invalid upc: too short
        self.assertRaises(ValidationError, models.Product.objects.create, upc='1234')
        # invalid upc: correct length, check digit is invalid
        self.assertRaises(ValidationError, models.Product.objects.create, upc='012345678999')
