from typing import NamedTuple

from reactivated import Pick, template

from products.models import BarcodeSheet, FieldRepresentative

from .types import BarcodeSheetInterface, SheetTypeDescriptionInterface


@template
class StockTrackerBarcodeSheet(NamedTuple):
    barcodeSheet: BarcodeSheetInterface
    total_products: int
    sheetTypeInfo: SheetTypeDescriptionInterface
    possibleSheetTypesInfo: list[SheetTypeDescriptionInterface]


@template
class StockTrackerBarcodeSheetsHistory(NamedTuple):
    current_field_rep_id: int | None
    field_representatives: list[Pick[FieldRepresentative, "pk", "name"]]
    recent_barcode_sheets: list[
        Pick[
            BarcodeSheet,
            "pk",
            "parent_company.short_name",
            "parent_company.expanded_name",
            "work_cycle.start_date",
            "store.name",
            "datetime_created",
            "product_additions.pk",
        ]
    ]


@template
class StocktrackerStoreManagerNames(NamedTuple):
    field_reps: list[
        Pick[
            FieldRepresentative,
            "pk",
            "name",
            "stores.pk",
            "stores.name",
            "stores.contacts.pk",
            "stores.contacts.first_name",
            "stores.contacts.last_name",
        ]
    ]


@template
class StockTrackerScanner(NamedTuple):
    field_reps: list[
        Pick[
            FieldRepresentative,
            "pk",
            "name",
            "stores.pk",
            "stores.name",
        ]
    ]


@template
class StockTrackerScanHistory(NamedTuple):
    field_reps: list[Pick[FieldRepresentative, "pk", "name", "stores.pk", "stores.name"]]
