from typing import TypedDict


class IImportedProductInfo(TypedDict):
    name: str
    upc: str
    location: str


class IPlanoProduct(TypedDict):
    upc: str
    name: str


# A home location can hold several products until an update is applied, then exactly one
TOldPlanoSnapshot = dict[str, list[IPlanoProduct]]
TNewPlanoSnapshot = dict[str, IPlanoProduct]
