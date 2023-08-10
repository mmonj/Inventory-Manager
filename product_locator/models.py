from typing import Any
from checkdigit import gs1

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Store(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self) -> str:
        return self.name


class Planogram(models.Model):
    name = models.CharField(max_length=50, default="Inline Plano")
    store = models.ForeignKey(Store, null=True, on_delete=models.CASCADE, related_name="planograms")
    date_start = models.DateField(null=False, blank=False, default=timezone.now)
    date_end = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.name} - {self.store}"

    class Meta:
        unique_together = ["name", "store"]


class HomeLocation(models.Model):
    name = models.CharField(max_length=25)
    planogram = models.ForeignKey(Planogram, on_delete=models.CASCADE, related_name="locations")

    def __str__(self) -> str:
        return f"{self.name} - {self.planogram}"

    class Meta:
        unique_together = ["name", "planogram"]


class Product(models.Model):
    upc = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    home_locations = models.ManyToManyField(HomeLocation, related_name="products")
    date_created = models.DateField(null=False, blank=False, default=timezone.now)

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

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.upc} {self.name}"
