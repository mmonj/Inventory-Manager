from attr import frozen


@frozen
class GetProductLocationRequest:
    upc: str
    store_id: int
