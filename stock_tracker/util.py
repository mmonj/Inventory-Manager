from typing import List, Optional
import shortuuid

from .types import SheetQueryInfoInterface, SheetTypeDescriptionInterface

from .serializers import StoreSerializer, FieldRepresentativeSerializer
from products.models import FieldRepresentative, ProductAddition, Store


def record_product_addition(
    product_addition: ProductAddition, is_product_scanned: bool = False
) -> None:
    if is_product_scanned and not product_addition.is_carried:
        product_addition.is_carried = True

    product_addition.update_date_scanned()
    product_addition.save(update_fields=["date_last_scanned", "is_carried"])


def set_not_carried(product_addition: ProductAddition) -> None:
    if product_addition.is_carried:
        product_addition.is_carried = False
        product_addition.save(update_fields=["is_carried"])


def get_territory_list():
    field_reps = FieldRepresentative.objects.prefetch_related("stores").all()
    territory_list = FieldRepresentativeSerializer(field_reps, many=True).data

    stores_data = StoreSerializer(Store.objects.all(), many=True).data
    territory_list.append({"id": shortuuid.uuid(), "name": "All Stores", "stores": stores_data})

    return territory_list


def get_sheet_type_info(
    sheet_type: str, possible_sheet_types_info: List[SheetTypeDescriptionInterface]
) -> Optional[SheetTypeDescriptionInterface]:
    for possible_sheet_type in possible_sheet_types_info:
        if sheet_type == possible_sheet_type["sheetType"]:
            return possible_sheet_type
    return None


def get_sheet_query_info(sheet_type: str) -> Optional[SheetQueryInfoInterface]:
    sheet_queries_info: List[SheetQueryInfoInterface] = [
        {
            "sheetType": "all-products",
            "is_carried_list": [True, False],
        },
        {
            "sheetType": "out-of-dist",
            "is_carried_list": [False],
        },
        {
            "sheetType": "in-dist",
            "is_carried_list": [True],
        },
    ]

    for sheet_query_info in sheet_queries_info:
        if sheet_type == sheet_query_info["sheetType"]:
            return sheet_query_info
    return None
