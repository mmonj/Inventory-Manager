import datetime
import re
from checkdigit import gs1

from django.core.exceptions import ValidationError
from django.db import models


class WorkCycle(models.Model):
    start_date = models.DateField(default=datetime.date.today)
    end_date = models.DateField(default=datetime.date.today)

    def __str__(self):
        return f'{self.start_date} to {self.end_date}'


class FieldRepresentative(models.Model):
    name = models.CharField(max_length=255)
    work_email = models.EmailField(max_length=255, unique=True)

    def __str__(self):
        return f'{self.name}; {self.work_email}'

    # string for debugging
    def _strd(self):
        return f'FieldRepresentative(name={ repr(self.name) }, work_email={ repr(self.work_email) })'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class BrandParentCompany(models.Model):
    short_name = models.CharField(max_length=50, unique=True, null=True)
    expanded_name = models.CharField(max_length=50, unique=True, null=True, blank=True)

    def __str__(self):
        return self.expanded_name or self.short_name

    # string for debugging
    def _strd(self):
        return f'BrandParentCompany(short_name={ repr(self.short_name) }, expanded_name={ repr(self.expanded_name) })'



class Product(models.Model):
    upc = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    parent_company = models.ForeignKey(BrandParentCompany, null=True, blank=True, on_delete=models.SET_NULL, related_name='upcs')

    def __str__(self):
        return f'{self.upc}: {self.name}'
    
    # string for debugging
    def _strd(self):
        return f'Product(upc={ repr(self.upc) }, name={ repr(self.name) }, parent_company={ self.parent_company })'

    def is_valid_upc(self):
        return gs1.validate(self.upc)

    def clean(self, *args, **kwargs):
        if len(self.upc) != 12:
            raise ValidationError('UPC number must be 12 digits')
        if not gs1.validate(self.upc):
            expected_check_digit = gs1.calculate(self.upc[:11])
            raise ValidationError(f'The UPC number is invalid. Expected a check digit of {expected_check_digit}')
        super().clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class PersonnelContact(models.Model):
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        if not self.first_name and not self.last_name:
            return '<Blank>'
        return f'{self.first_name} {self.last_name}'

    # string for debugging
    def _strd(self):
        return f'PersonnelContact(first_name={ repr(self.first_name) }, last_name={ repr(self.last_name) })'


class Store(models.Model):
    name = models.CharField(max_length=255, null=True, unique=True)
    store_contact = models.ForeignKey(PersonnelContact, null=True, blank=True, on_delete=models.SET_NULL, related_name="associated_stores")
    field_representative = models.ForeignKey(FieldRepresentative, null=True, blank=True, on_delete=models.SET_NULL, related_name="stores")

    # non-column attribute
    trailing_number_re = re.compile(r' *-* *[0-9]+ *$', flags=re.I)

    def __str__(self):
        return f'{self.name}'

    def _strd(self):
        return f'Store(name={ repr(self.name) }, store_contact={self.store_contact}, field_representative={self.field_representative})'

    def sanitize_store_name(self):
        self.name = re.sub(self.trailing_number_re, '', self.name)

    def clean(self, *args, **kwargs):
        if re.search(self.trailing_number_re, self.name):
            raise ValidationError(f'Store must not have a dash or trailing numbers: {self.name}')

        super().clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ProductAddition(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="associated_additions")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="associated_additions")
    date_added = models.DateField(default=datetime.date.today)
    is_carried = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.product.upc}; Carried {self.is_carried}; Store {self.store}'

    def _strd(self):
        return f'ProductAddition(store={self.store}, product={self.product}, date_added={self.date_added}, is_carried={self.is_carried})'

    class Meta:
        unique_together = ('store', 'product',)
