from typing import List, TypedDict


class ImportedFieldRepInfo(TypedDict):
    work_email: str


class ImportedProductStockData(TypedDict):
    time_added: float
    instock: bool
    date_scanned: str


class ImportedStoreData(TypedDict):
    manager_names: list[str]


class ImportedProductInfo(TypedDict):
    fs_name: str


class BasicStoreInfo(TypedDict):
    first_name: str
    last_name: str


class IUpcItemDbOffer(TypedDict):
    merchant: str
    domain: str
    title: str
    currency: str
    list_price: str
    price: float
    shipping: str
    condition: str
    availability: str
    link: str
    updated_t: int


class IUpcItemDbItem(TypedDict):
    ean: str
    title: str
    description: str
    upc: str
    brand: str
    model: str
    color: str
    size: str
    dimension: str
    weight: str
    category: str
    currency: str
    lowest_recorded_price: float
    highest_recorded_price: float
    images: List[str]
    offers: List[IUpcItemDbOffer]


class IUpcItemDbData(TypedDict):
    code: str
    total: int
    offset: int
    items: List[IUpcItemDbItem]


class TParsedAddress(TypedDict):
    address_1: str
    city: str
    state: str
    zip_code: str
