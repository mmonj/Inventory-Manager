from typing import NamedTuple

from reactivated import Pick, template

from products.models import BrandParentCompany, FieldRepresentative

from .forms import NewStoresForm
from .types import BarcodeSheetInterface, SheetTypeDescriptionInterface


@template
class StockTrackerIndex(NamedTuple):
    pass


@template
class StockTrackerLogin(NamedTuple):
    is_invalid_credentials: bool


@template
class StockTrackerAddNewStores(NamedTuple):
    form: NewStoresForm


@template
class StockTrackerBarcodeSheet(NamedTuple):
    barcodeSheet: BarcodeSheetInterface  # noqa: N815 -- attribute name needs to comply with client-side expectation
    sheetTypeInfo: SheetTypeDescriptionInterface  # noqa: N815 -- attribute name needs to comply with client-side expectation
    possibleSheetTypesInfo: list[SheetTypeDescriptionInterface]  # noqa: N815 -- attribute name needs to comply with client-side expectation


@template
class StockTrackerBarcodeSheetsHistory(NamedTuple):
    current_field_rep_id: int | None
    field_representatives: list[Pick[FieldRepresentative, "pk", "name"]]


@template
class StockTrackerScanner(NamedTuple):
    field_reps: list[
        Pick[
            FieldRepresentative,
            "pk",
            "name",
            "stores.pk",
            "stores.name",
            "stores.last_seen",
        ]
    ]


@template
class StockTrackerScanHistory(NamedTuple):
    field_reps: list[
        Pick[FieldRepresentative, "pk", "name", "stores.pk", "stores.name", "stores.last_seen"]
    ]
    brand_parent_companies: list[Pick[BrandParentCompany, "pk", "short_name", "expanded_name"]]
