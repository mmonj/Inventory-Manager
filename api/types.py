from typing import List, TypedDict


class ProductInterface(TypedDict):
    upc: str
    name: str


class GetStoreAdditionsInterface(TypedDict):
    store_id: int
    client_name: str
    products: List[ProductInterface]


class UpdateStoreFieldRepInterface(TypedDict):
    store_id: int
    new_field_rep_id: int
