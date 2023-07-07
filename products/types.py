from typing import TypedDict


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
