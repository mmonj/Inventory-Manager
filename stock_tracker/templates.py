from typing import List, NamedTuple, Optional
from reactivated import Pick, template

from products.models import BarcodeSheet, FieldRepresentative

from .types import BarcodeSheetInterface, SheetTypeDescriptionInterface


@template
class StockTrackerBarcodeSheet(NamedTuple):
    barcodeSheet: BarcodeSheetInterface
    sheetTypeInfo: SheetTypeDescriptionInterface
    possibleSheetTypesInfo: List[SheetTypeDescriptionInterface]


@template
class StockTrackerBarcodeSheetsHistory(NamedTuple):
    current_field_rep_id: Optional[int]
    field_representatives: List[Pick[FieldRepresentative, "pk", "name"]]
    recent_barcode_sheets: List[
        Pick[
            BarcodeSheet,
            "pk",
            "parent_company.short_name",
            "work_cycle.start_date",
            "store.name",
            "datetime_created",
            "product_additions.pk",
        ]
    ]
