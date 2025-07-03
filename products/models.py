from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING, Any

import requests
from checkdigit import gs1
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from server.utils.common import get_degree_offset_from_meters
from server.utils.typedefs import CommonModel, TFailure, TResult, TSuccess

from .types import UPC_A_LENGTH

if TYPE_CHECKING:
    from .types import TParsedAddress


class WorkCycle(CommonModel):
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(default=timezone.now)

    class Meta:
        db_table = "work_cycles"
        unique_together = ("start_date", "end_date")

    def __str__(self) -> str:
        return f"{self.start_date} to {self.end_date}"


class FieldRepresentative(CommonModel):
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


class BrandParentCompany(CommonModel):
    short_name = models.CharField(max_length=50, unique=True, null=True)
    expanded_name = models.CharField(max_length=50, null=True, blank=True)
    canonical_name = models.CharField(max_length=100, blank=True, default="")
    third_party_logo = models.ImageField(
        null=True, blank=True, upload_to="products/images/brand_logos"
    )

    default_upc_prefixes = ArrayField(
        base_field=models.CharField(max_length=1),
        default=list,
        blank=True,
        verbose_name="UPC prefix digit(s)",
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
    upc = models.CharField(max_length=UPC_A_LENGTH, unique=True)
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
        # return self.upc.isnumeric() and len(self.upc) == UPC_A_LENGTH and gs1.validate(self.upc)
        try:
            self.clean()
            return True
        except ValidationError:
            return False

    def clean(self, *args: Any, **kwargs: Any) -> None:
        if not self.parent_company:
            raise ValidationError("Parent company is required")

        # Validate UPC format
        if self.upc is None or not self.upc.isnumeric():
            raise ValidationError("UPC number must be numeric")
        if len(self.upc) != UPC_A_LENGTH:
            raise ValidationError(f"UPC number must be {UPC_A_LENGTH} digits")
        if not gs1.validate(self.upc):
            expected_check_digit = gs1.calculate(self.upc[:11])
            raise ValidationError(
                f"The UPC number is invalid. Expected a check digit of {expected_check_digit}"
            )

        # Validate UPC prefix using default prefixes list
        allowed_prefixes = self.parent_company.default_upc_prefixes or []
        if len(allowed_prefixes) == 0:
            raise ValidationError(
                f"Parent company {self.parent_company.short_name or self.parent_company.id} has no allowed UPC prefixes"
            )

        upc_prefix = self.upc[0]
        if upc_prefix not in allowed_prefixes:
            raise ValidationError(
                f"UPC prefix {upc_prefix} is not allowed for the parent company "
                f"{self.parent_company.short_name or self.parent_company.id}. "
                f"Allowed prefixes: {allowed_prefixes}"
            )

        # validate UPC prefix using PrefixMapping
        prefix_mappings = self.parent_company.prefix_mappings.all()
        matching_mapping: PrefixMapping | None = None

        for mapping in prefix_mappings:
            if mapping.product_name_regex and re.match(
                mapping.product_name_regex, self.name or "", re.IGNORECASE
            ):
                matching_mapping = mapping
                break

        if matching_mapping:
            upc_prefix = self.upc[0]
            if upc_prefix != matching_mapping.prefix:
                raise ValidationError(
                    f"Expected UPC prefix {matching_mapping.prefix} for product name {self.name!r}, but got {upc_prefix}"
                )

        super().clean(*args, **kwargs)


class PrefixMapping(CommonModel):
    """Mapping of UPC prefixes to product names (starts with)"""

    prefix = models.CharField(max_length=1)
    product_name_regex = models.CharField(max_length=255)

    parent_company = models.ForeignKey(
        BrandParentCompany, on_delete=models.CASCADE, related_name="prefix_mappings"
    )


class UpcCorrection(CommonModel):
    parent_company = models.ForeignKey(
        BrandParentCompany, on_delete=models.CASCADE, related_name="upc_corrections"
    )
    bad_upc = models.CharField(max_length=20, db_index=True)
    actual_upc = models.CharField(max_length=UPC_A_LENGTH)

    class Meta:
        unique_together = ("parent_company", "bad_upc")
        db_table = "upc_corrections"

    def __str__(self) -> str:
        return f"UPC Correction for {self.parent_company.short_name}"

    def clean(self) -> None:
        super().clean()

        if not self.actual_upc or len(self.actual_upc) != UPC_A_LENGTH:
            raise ValidationError(
                f"Actual UPC is missing or invalid length (should be {UPC_A_LENGTH})"
            )

        allowed_prefixes = self.parent_company.default_upc_prefixes or []
        actual_prefix = self.actual_upc[0]

        if actual_prefix not in allowed_prefixes:
            raise ValidationError(
                f"Actual UPC {self.actual_upc!r} does not start with an allowed prefix "
                f"for {self.parent_company.short_name or self.parent_company.id}: "
                f"{allowed_prefixes}"
            )

        expected_check_digit = gs1.missing(self.actual_upc[:11] + "?")
        if not gs1.validate(self.actual_upc):
            raise ValidationError(
                f"Bad check digit. Expected {expected_check_digit}, got {self.actual_upc[-1]}"
            )


class PersonnelContact(CommonModel):
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
    name = models.CharField(max_length=255, blank=True, db_index=True)
    field_representative = models.ForeignKey(
        "FieldRepresentative",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="stores",
    )
    date_created = models.DateField(default=timezone.now)
    guid = models.CharField(max_length=150, blank=True, default="")
    site_id = models.IntegerField(blank=True, null=True, default=None, unique=True)
    address_1 = models.CharField(max_length=100, blank=True, default="")
    city = models.CharField(max_length=50, blank=True, default="")
    state = models.CharField(max_length=20, blank=True, default="")
    zip_code = models.CharField(max_length=20, blank=True, default="")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    __trailing_number_re = re.compile(r" *-* *[0-9]+ *$", flags=re.IGNORECASE)

    class Meta:
        db_table = "stores"

    def __str__(self) -> str:
        if self.name == "":
            return f"guid: {self.guid}"
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

    def validate_guid(self) -> None:
        if self.guid is None:
            return
        self.guid = self.guid.upper().strip()

    def clean(self, *args: Any, **kwargs: Any) -> None:
        self.validate_name()
        self.validate_guid()
        super().clean(*args, **kwargs)

    @staticmethod
    def parse_us_address(raw_address: str) -> TResult[TParsedAddress, ValueError]:
        try:
            import usaddress  # type: ignore [import-untyped]  # noqa: PLC0415

            tagged, _ = usaddress.tag(raw_address)
            street_items = [
                tagged.get("AddressNumber", "").upper(),
                tagged.get("StreetNamePreType", "").upper(),
                tagged.get("StreetName", "").upper(),
                tagged.get("StreetNamePostType", "").upper(),
            ]
            address_1 = " ".join(street_items).strip()
            address_1 = " ".join(address_1.split())

            if address_1.strip() == "":
                return TFailure(
                    ValueError(f"Parsed address had no valid address_1 part: {raw_address!r}")
                )

            return TSuccess(
                {
                    "address_1": address_1,
                    "city": tagged.get("PlaceName", "").title(),
                    "state": tagged.get("StateName", "").upper(),
                    "zip_code": tagged.get("ZipCode", ""),
                }
            )

        except usaddress.RepeatedLabelError:
            return TFailure(ValueError(f"Could not reliably parse address {raw_address!r}"))

    @staticmethod
    def geocode_address(address: str | TParsedAddress) -> TResult[tuple[float, float], ValueError]:
        if isinstance(address, dict):
            address_parts = [
                address["address_1"],
                address["city"],
                address["state"],
                address["zip_code"],
            ]
            address_payload = ", ".join(part for part in address_parts if part).strip()
        else:
            address_payload = address

        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address_payload,
            "format": "json",
            "limit": "1",
        }

        response = requests.get(
            url, params=params, headers={"User-Agent": "store-import-script"}, timeout=20
        )
        response.raise_for_status()
        data = response.json()

        if not data:
            return TFailure(ValueError(f"No geocoding result for address: {address_payload!r}"))

        lat = float(data[0]["lat"])
        lon = float(data[0]["lon"])
        return TSuccess((lat, lon))

    @staticmethod
    def filter_by_geolocation(
        raw_address: str, prefetch_related: list[str] | None = None
    ) -> TResult[models.QuerySet[Store], ValueError]:
        if prefetch_related is None:
            prefetch_related = []

        coordinates_result = Store.geocode_address(raw_address)
        if not coordinates_result.ok:
            return TFailure(coordinates_result.err)

        lat, lon = coordinates_result.value

        return TSuccess(Store.filter_by_lat_lon_bounds(lat, lon, 40, prefetch_related))

    @staticmethod
    def filter_by_lat_lon_bounds(
        latitude: float,
        longitude: float,
        meters_offset: float = 40.0,
        prefetch_related: list[str] | None = None,
    ) -> models.QuerySet[Store]:
        if prefetch_related is None:
            prefetch_related = []

        degree_offset = get_degree_offset_from_meters(meters_offset)

        return Store.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__gte=latitude - degree_offset,
            latitude__lte=latitude + degree_offset,
            longitude__gte=longitude - degree_offset,
            longitude__lte=longitude + degree_offset,
        ).prefetch_related(*prefetch_related)


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
