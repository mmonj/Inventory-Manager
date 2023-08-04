from attr import frozen


@frozen
class ProductAdditionsGETRequest:
    store_id: int
    # page number which to fetch
    page: int
    sort_by: str


@frozen
class ProductAdditionUncarryRequest:
    product_addition_id: int


@frozen
class LogProductScanRequest:
    upc: str
    store_id: int
