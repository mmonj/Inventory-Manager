from typing import List, Literal, TypedDict


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


class SheetTypeInterface(TypedDict):
    sheetType: Literal["all-products", "out-of-dist", "in-dist"]


class SheetTypeDescriptionInterface(SheetTypeInterface):
    sheetTypeVerbose: Literal["All Products", "Out Of Distribution", "In Distribution"]


class SheetQueryInfoInterface(SheetTypeInterface):
    is_carried_list: List[bool]
