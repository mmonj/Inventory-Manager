import datetime
import re
from checkdigit import gs1

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class WorkCycle(models.Model):
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(default=timezone.now)

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
    short_name = models.CharField(max_length=50, unique=True, null=True, blank=True)
    expanded_name = models.CharField(max_length=50, null=True, blank=True)
    
    @staticmethod
    def get_default():
        return BrandParentCompany.objects.get_or_create(short_name='Unknown', expanded_name='Unknown brand')[0].pk

    def __str__(self):
        return self.expanded_name or self.short_name

    # string for debugging
    def _strd(self):
        return f'BrandParentCompany(short_name={ repr(self.short_name) }, expanded_name={ repr(self.expanded_name) })'


class Product(models.Model):
    upc = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    parent_company = models.ForeignKey(
        BrandParentCompany, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name='upcs'
    )

    def __str__(self):
        return f'{self.upc}: {self.name}'
    
    # string for debugging
    def _strd(self):
        return f'Product(upc={ repr(self.upc) }, name={ repr(self.name) }, parent_company={ self.parent_company })'

    def is_valid_upc(self):
        # return self.upc.isnumeric() and len(self.upc) == 12 and gs1.validate(self.upc)
        try:
            self.clean()
            return True
        except ValidationError:
            return False

    def clean(self, *args, **kwargs):
        if not self.upc.isnumeric():
            raise ValidationError('UPC number be numeric')
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
    first_name = models.CharField(max_length=255, null=True)
    last_name = models.CharField(max_length=255, null=True)
    store = models.ForeignKey('Store', null=True, blank=True, on_delete=models.CASCADE, related_name='contacts')

    def __str__(self):
        if not self.first_name and not self.last_name:
            return '<Blank>'
        return f'{self.first_name} {self.last_name}'

    # string for debugging
    def _strd(self):
        return f'PersonnelContact(first_name={ repr(self.first_name) }, last_name={ repr(self.last_name) }, store={ repr(self.store) })'


class Store(models.Model):
    name = models.CharField(max_length=255, null=True, unique=True)
    field_representative = models.ForeignKey(FieldRepresentative, null=True, blank=True, on_delete=models.SET_NULL, related_name="stores")

    # non-column attribute
    trailing_number_re = re.compile(r' *-* *[0-9]+ *$', flags=re.I)

    def __str__(self):
        return f'{self.name}'

    def _strd(self):
        return f'Store(name={ repr(self.name) }, field_representative={self.field_representative})'

    def sanitize_store_name(self):
        self.name = re.sub(self.trailing_number_re, '', self.name)

    def clean(self, *args, **kwargs):
        if re.search(self.trailing_number_re, self.name):
            raise ValidationError(f'Store must not have a dash or trailing numbers: {self.name}')

        self.name = self.name.strip()
        super().clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ProductAddition(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="associated_additions")
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="associated_additions")
    date_added = models.DateField(default=timezone.now)
    date_last_scanned = models.DateTimeField(null=True, blank=True)
    is_carried = models.BooleanField(default=False)
    
    def update_date_scanned(self):
        self.date_last_scanned = timezone.now()

    def __str__(self):
        return f'{self.product.upc}; Carried {self.is_carried}; Store {self.store}'

    def _strd(self):
        return f'ProductAddition(store={self.store}, product={self.product}, date_added={self.date_added}, date_last_scanned={self.date_last_scanned}, is_carried={self.is_carried})'

    class Meta:
        unique_together = ('store', 'product',)
