from typing import TypedDict


class IImportedProductInfo(TypedDict):
    name: str
    upc: str
    location: str


class IPlanoProduct(TypedDict):
    upc: str
    name: str


TPlanoSnapshot = dict[str, IPlanoProduct]
