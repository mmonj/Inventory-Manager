from attr import frozen


@frozen
class ProductAdditionsGETRequest:
    store_id: int
    # page number which to fetch
    page: int
    # optional substring filter on the associated Product's name; empty string means no filter
    product_name: str = ""
    # comma-separated BrandParentCompany pks to filter by; empty string means no filter (all)
    brand_parent_company_ids: str = ""


@frozen
class ProductAdditionUncarryRequest:
    product_addition_id: int


@frozen
class LogProductScanRequest:
    upc: str
    store_id: int


@frozen
class BarcodeSheetsGETRequest:
    # page number which to fetch
    page: int
    # optional FieldRepresentative pk to filter by; empty string means no filter (all reps)
    field_representative_id: str = ""
