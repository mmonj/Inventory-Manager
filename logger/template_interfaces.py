from typing import List, TypedDict


class ProductInterface(TypedDict):
    upc: str
    name: str
    upc_sections: List[str]
    item_image_url: str
    barcode_b64: str


class ParentCompanyInterface(TypedDict):
    short_name: str
    third_party_logo_url: str


class ProductAdditionInterface(TypedDict):
    id: int
    product: ProductInterface
    is_carried: bool
    is_new: bool


class BarcodeSheetInterface(TypedDict):
    barcode_sheet_id: int
    store_name: str
    parent_company: ParentCompanyInterface
    product_additions: List[ProductAdditionInterface]
