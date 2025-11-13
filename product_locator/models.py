from typing import Any, Literal, NamedTuple, cast

from checkdigit import gs1
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from products.types import UPC_A_LENGTH


class Store(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self) -> str:
        return self.name


TPlanoTypeValue = Literal["inline", "seasonal", "other"]


class Planogram(models.Model):
    class TPlanoType(NamedTuple):
        value: TPlanoTypeValue
        label: str

    class PlanoType(models.TextChoices):
        REGULAR = ("regular", "Regular Planogram")
        SEASONAL = ("seasonal", "Seasonal Planogram")
        OTHER = ("other", "Other Planogram")

    name = models.CharField(max_length=50, default="Inline Plano")
    plano_type = models.CharField(
        max_length=10, choices=PlanoType.choices, default=PlanoType.REGULAR
    )
    store = models.ForeignKey(Store, null=True, on_delete=models.CASCADE, related_name="planograms")
    date_start = models.DateField(null=False, blank=False, default=timezone.now)
    date_end = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("name", "store")

    def __str__(self) -> str:
        return f"{self.name} - {self.store}{self.plano_status}"

    def get_plano_status(self) -> str:
        if self.date_end is None:
            return ""
        return " [OUTDATED]"

    @property
    def plano_type_info(self) -> TPlanoType:
        return self.TPlanoType(
            cast("TPlanoTypeValue", self.plano_type), label=self.get_plano_type_display()
        )

    @property
    def plano_status(self) -> str:
        return self.get_plano_status()


class HomeLocation(models.Model):
    name = models.CharField(max_length=25)
    planogram = models.ForeignKey(Planogram, on_delete=models.CASCADE, related_name="locations")

    class Meta:
        unique_together = ("name", "planogram")

    def __str__(self) -> str:
        return f"{self.name} - {self.planogram}"

    @property
    def display_name(self) -> str:
        return f"{self.name} - {self.planogram.name}{self.planogram.plano_status}"


class Product(models.Model):
    upc = models.CharField(max_length=UPC_A_LENGTH, unique=True)
    name = models.CharField(max_length=100, blank=True, default="")
    home_locations = models.ManyToManyField(HomeLocation, related_name="products")
    date_created = models.DateField(null=False, blank=False, default=timezone.now)

    def __str__(self) -> str:
        return f"{self.upc} {self.name}"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

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
        if len(self.upc) != UPC_A_LENGTH:
            raise ValidationError(f"UPC number must be {UPC_A_LENGTH} digits")
        if not gs1.validate(self.upc):
            expected_check_digit = gs1.calculate(self.upc[:11])
            raise ValidationError(
                f"The UPC number is invalid. Expected a check digit of {expected_check_digit}"
            )
        super().clean(*args, **kwargs)


class ProductScanAudit(models.Model):
    product_type = models.CharField(max_length=50, null=True, blank=False)  # noqa: DJ001
    datetime_created = models.DateTimeField(null=False, blank=False, default=timezone.now)
    products_in_stock = models.ManyToManyField(Product, related_name="scan_audits")

    def __str__(self) -> str:
        return f"{self.product_type} - {self.datetime_created.isoformat()}"
