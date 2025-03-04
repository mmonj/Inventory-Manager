import re
from pathlib import Path
from typing import Any

from checkdigit import gs1
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class WorkCycle(models.Model):
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(default=timezone.now)

    class Meta:
        db_table = "work_cycles"
        unique_together = ("start_date", "end_date")

    def __str__(self) -> str:
        return f"{self.start_date} to {self.end_date}"


class FieldRepresentative(models.Model):
    name = models.CharField(max_length=255)
    work_email = models.EmailField(max_length=255, unique=True)

    class Meta:
        db_table = "field_representatives"

    def __str__(self) -> str:
        return f"{self.name}; {self.work_email}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    # string for debugging
    def _strd(self) -> str:
        return f"FieldRepresentative(name={ self.name !r}, work_email={ self.work_email !r})"


class BrandParentCompany(models.Model):
    short_name = models.CharField(max_length=50, unique=True, null=True)
    expanded_name = models.CharField(max_length=50, null=True, blank=True)
    third_party_logo = models.ImageField(
        null=True, blank=True, upload_to="products/images/brand_logos"
    )

    class Meta:
        db_table = "brand_parent_companies"

    def __str__(self) -> str:
        return self.expanded_name or self.short_name or "--"

    # string for debugging
    def _strd(self) -> str:
        return f"BrandParentCompany(short_name={ self.short_name !r}, expanded_name={ self.expanded_name !r})"


def product_image_upload_location(instance: "Product", filename: str) -> str:
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
        BrandParentCompany, null=True, blank=True, on_delete=models.SET_NULL, related_name="upcs"
    )
    item_image = models.ImageField(null=True, blank=True, upload_to=product_image_upload_location)
    date_added = models.DateField(default=timezone.now)

    class Meta:
        db_table = "products"

    def __str__(self) -> str:
        return f"{self.upc} - {self.parent_company} - {self.name}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    # string for debugging
    def _strd(self) -> str:
        return f"Product(upc={ self.upc !r}, name={ self.name !r}, parent_company={ self.parent_company })"

    def is_valid_upc(self) -> bool:
        # return self.upc.isnumeric() and len(self.upc) == 12 and gs1.validate(self.upc)
        try:
            self.clean()
            return True
        except ValidationError:
            return False

    def clean(self, *args: Any, **kwargs: Any) -> None:
        if self.upc is None or not self.upc.isnumeric():
            raise ValidationError("UPC number be numeric")
        if len(self.upc) != 12:
            raise ValidationError("UPC number must be 12 digits")
        if not gs1.validate(self.upc):
            expected_check_digit = gs1.calculate(self.upc[:11])
            raise ValidationError(
                f"The UPC number is invalid. Expected a check digit of {expected_check_digit}"
            )
        super().clean(*args, **kwargs)


class PersonnelContact(models.Model):
    first_name = models.CharField(max_length=255, null=True)
    last_name = models.CharField(max_length=255, null=True)
    store = models.ForeignKey(
        "Store", null=True, blank=True, on_delete=models.CASCADE, related_name="contacts"
    )

    class Meta:
        db_table = "personnel_contacts"

    def __str__(self) -> str:
        if not self.first_name and not self.last_name:
            return "<Blank>"
        return f"{self.first_name} {self.last_name}"

    # string for debugging
    def _strd(self) -> str:
        return f"PersonnelContact(first_name={ self.first_name !r}, \
            last_name={ self.last_name !r}, store={ self.store !r})"


class StoreGUID(models.Model):
    value = models.CharField(max_length=255, unique=True)
    date_created = models.DateField(default=timezone.now)

    def __str__(self) -> str:
        return self.value

    def clean(self, *args: Any, **kwargs: Any) -> None:
        if not self.value:
            raise ValidationError("Value is required for StoreGUID")

        self.value = self.value.upper().strip()

        super().clean(*args, **kwargs)


class Store(models.Model):
    name = models.CharField(max_length=255, null=True, unique=True)
    field_representative = models.ForeignKey(
        FieldRepresentative, null=True, blank=True, on_delete=models.SET_NULL, related_name="stores"
    )
    date_created = models.DateField(default=timezone.now)
    guid = models.CharField(max_length=150, null=True, blank=True, unique=True)
    # store_guids = models.ManyToManyField(StoreGUID, related_name="stores")

    # non-column attribute
    __trailing_number_re = re.compile(r" *-* *[0-9]+ *$", flags=re.IGNORECASE)

    class Meta:
        db_table = "stores"

    def __str__(self) -> str:
        return f"{self.name}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def sanitize_name(self) -> None:
        if self.name is None:
            return
        self.name = re.sub(self.__trailing_number_re, "", self.name)

    def validate_name(self) -> None:
        if self.name is None:
            raise ValidationError("Store name should not be null")

        self.name = self.name.upper().strip()

        if self.name == "":
            raise ValidationError("Store name cannot be empty")

        # if re.search(self.__trailing_number_re, self.name):
        #     raise ValidationError(
        #         f"Store name must not have a dash or trailing numbers: {self.name}"
        #     )

    def validate_guid(self) -> None:
        if self.guid is None:
            return

        self.guid = self.guid.upper().strip()

    def clean(self, *args: Any, **kwargs: Any) -> None:
        self.validate_name()
        self.validate_guid()

        super().clean(*args, **kwargs)


class ProductAddition(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="associated_additions"
    )
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="associated_additions")
    date_added = models.DateField(default=timezone.now)
    date_last_scanned = models.DateTimeField(null=True, blank=True)
    is_carried = models.BooleanField(default=False)
    date_ordered = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("store", "product")
        db_table = "product_additions"

    def __str__(self) -> str:
        return f"{self.product.upc}; Carried {self.is_carried}; Store {self.store}"

    def update_date_scanned(self) -> None:
        self.date_last_scanned = timezone.now()

    def _strd(self) -> str:
        return f"ProductAddition(store={self.store}, product={self.product}, date_added={self.date_added}, \
            date_last_scanned={self.date_last_scanned}, is_carried={self.is_carried})"


class BarcodeSheet(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="barcode_sheets")
    parent_company = models.ForeignKey(
        BrandParentCompany, on_delete=models.SET_NULL, null=True, related_name="barcode_sheets"
    )
    product_additions = models.ManyToManyField(ProductAddition, related_name="barcode_sheets")
    upcs_hash = models.TextField(null=True)
    upcs_list = models.JSONField(null=True, blank=True)
    datetime_created = models.DateTimeField(default=timezone.now)
    work_cycle = models.ForeignKey(
        WorkCycle, null=True, on_delete=models.SET_NULL, related_name="barcode_sheets"
    )

    class Meta:
        db_table = "barcode_sheets"
        unique_together = ("store", "parent_company", "work_cycle", "upcs_hash")

    def __str__(self) -> str:
        return f"Barcode Sheet: {self.work_cycle}: {self.parent_company} {self.store.name}"
