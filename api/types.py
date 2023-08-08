from typing import List, Optional

from attr import frozen


@frozen
class IProduct:
    upc: str
    name: str


@frozen
class IGetStoreProductAdditions:
    store_id: int
    client_name: str
    products: List[IProduct]


@frozen
class IUpdateStoreFieldRep:
    store_id: int
    new_field_rep_id: int


@frozen
class IUpdateStorePersonnel:
    store_id: int
    existing_personnel_id: Optional[int]
    new_personnel_first_name: str
    new_personnel_last_name: str


@frozen
class IUpdateStoreInfo:
    store_name: str
    partial_store_address: Optional[str]
    # possible store GUID. The GUID indicated may or may not be unique per store,
    # but it will be stored for historical purposes
    store_guid: str
