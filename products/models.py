import re
from checkdigit import gs1
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class WorkCycle(models.Model):
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(default=timezone.now)

    def __str__(self):
        return f'{self.start_date} to {self.end_date}'

    class Meta:
        db_table = 'work_cycles'
        unique_together = ["start_date", "end_date"]


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

    class Meta:
        db_table = 'field_representatives'


class BrandParentCompany(models.Model):
    short_name = models.CharField(max_length=50, unique=True, null=True)
    expanded_name = models.CharField(max_length=50, null=True, blank=True)
    third_party_logo = models.ImageField(null=True, blank=True, upload_to='products/images/brand_logos')

    def __str__(self):
        return self.expanded_name or self.short_name or '--'

    # string for debugging
    def _strd(self):
        return f'BrandParentCompany(short_name={ repr(self.short_name) }, expanded_name={ repr(self.expanded_name) })'

    class Meta:
        db_table = 'brand_parent_companies'


def product_image_upload_location(instance, filename):
    """Change filename to be based on the UPC number of the product

    Args:
        instance (Product): Product model instance
        filename (str): <str> representation of the default image filename

    Returns:
        str: new image file path
    """
    file = Path(filename)
    new_path = Path("products/images/product_images", instance.upc + file.suffix)
    return str(new_path)


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
    item_image = models.ImageField(null=True, blank=True, upload_to=product_image_upload_location)
    date_added = models.DateField(default=timezone.now)

    def __str__(self):
        return f'{self.upc} - {self.parent_company} - {self.name}'

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
        if self.upc is None or not self.upc.isnumeric():
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

    class Meta:
        db_table = 'products'


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
        return f'PersonnelContact(first_name={ repr(self.first_name) }, \
            last_name={ repr(self.last_name) }, store={ repr(self.store) })'

    class Meta:
        db_table = 'personnel_contacts'


class Store(models.Model):
    name = models.CharField(max_length=255, null=True, unique=True)
    field_representative = models.ForeignKey(FieldRepresentative, null=True,
                                             blank=True, on_delete=models.SET_NULL, related_name="stores")

    # non-column attribute
    trailing_number_re = re.compile(r' *-* *[0-9]+ *$', flags=re.I)

    def __str__(self):
        return f'{self.name}'

    def _strd(self):
        return f'Store(name={ repr(self.name) }, field_representative={self.field_representative})'

    def sanitize_store_name(self):
        self.name = re.sub(self.trailing_number_re, '', self.name)

    def clean(self, *args, **kwargs):
        if self.name is None:
            return

        if re.search(self.trailing_number_re, self.name):
            raise ValidationError(f'Store name must not have a dash or trailing numbers: {self.name}')

        self.name = self.name.strip()
        if self.name == '':
            raise ValidationError('Store name cannot be empty')

        super().clean(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'stores'


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
        return f'ProductAddition(store={self.store}, product={self.product}, date_added={self.date_added}, \
            date_last_scanned={self.date_last_scanned}, is_carried={self.is_carried})'

    class Meta:
        unique_together = ['store', 'product']
        db_table = 'product_additions'


class BarcodeSheet(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="barcode_sheets")
    parent_company = models.ForeignKey(BrandParentCompany, on_delete=models.SET_NULL,
                                       null=True, related_name="barcode_sheets")
    product_additions = models.ManyToManyField(ProductAddition, related_name="barcode_sheets")
    datetime_created = models.DateTimeField(default=timezone.now)
    work_cycle = models.ForeignKey(WorkCycle, null=True, on_delete=models.SET_NULL, related_name="barcode_sheets")

    class Meta:
        db_table = "barcode_sheets"
        unique_together = ["store", "parent_company", "work_cycle"]

    def __str__(self):
        return f'Barcode Sheet: {self.work_cycle}: {self.store.name}'
