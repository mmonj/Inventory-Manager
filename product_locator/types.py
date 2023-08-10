from attr import frozen
from typing import TypedDict


class IImportedProductInfo(TypedDict):
    name: str
    upc: str
    location: str


@frozen
class GetProductLocationRequest:
    upc: str
    store_id: int