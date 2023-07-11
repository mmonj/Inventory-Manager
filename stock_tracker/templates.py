from typing import List, NamedTuple
from reactivated import template

from .types import BarcodeSheetInterface, SheetTypeDescriptionInterface


@template
class StockTrackerBarcodeSheet(NamedTuple):
    barcodeSheet: BarcodeSheetInterface
    sheetTypeInfo: SheetTypeDescriptionInterface
    possibleSheetTypesInfo: List[SheetTypeDescriptionInterface]
    excludeBsOverrides: bool
