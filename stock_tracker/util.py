from products.models import ProductAddition

from .types import SheetQueryInfoInterface, SheetTypeDescriptionInterface


def record_product_addition(
    product_addition: ProductAddition, is_product_scanned: bool = False
) -> None:
    if is_product_scanned and not product_addition.is_carried:
        product_addition.is_carried = True

    product_addition.update_date_scanned()
    product_addition.save(update_fields=["date_last_scanned", "is_carried"])


def record_product_additions(
    product_additions: list[ProductAddition], is_product_scanned: bool = False
) -> None:
    for product_addition in product_additions:
        if is_product_scanned and not product_addition.is_carried:
            product_addition.is_carried = True
        product_addition.update_date_scanned()

    ProductAddition.objects.bulk_update(product_additions, ["date_last_scanned", "is_carried"])


def set_not_carried(product_addition: ProductAddition) -> None:
    if product_addition.is_carried:
        product_addition.is_carried = False
        product_addition.save(update_fields=["is_carried"])


def set_not_carried_bulk(product_additions: list[ProductAddition]) -> None:
    for product_addition in product_additions:
        product_addition.is_carried = False

    ProductAddition.objects.bulk_update(product_additions, ["is_carried"])


def get_sheet_type_info(
    sheet_type: str, possible_sheet_types_info: list[SheetTypeDescriptionInterface]
) -> SheetTypeDescriptionInterface | None:
    for possible_sheet_type in possible_sheet_types_info:
        if sheet_type == possible_sheet_type["sheetType"]:
            return possible_sheet_type
    return None


def get_sheet_query_info(sheet_type: str) -> SheetQueryInfoInterface | None:
    sheet_queries_info: list[SheetQueryInfoInterface] = [
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
