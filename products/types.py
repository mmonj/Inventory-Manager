from typing import TypedDict

UPC_A_LENGTH = 12


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
    images: list[str]
    offers: list[IUpcItemDbOffer]


class IUpcItemDbData(TypedDict):
    code: str
    total: int
    offset: int
    items: list[IUpcItemDbItem]


class TParsedAddress(TypedDict):
    address_1: str
    city: str
    state: str
    zip_code: str
