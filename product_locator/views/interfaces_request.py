from attr import frozen


@frozen
class GetProductLocationRequest:
    upc: str
    store_id: int


@frozen
class IAppendScanAudit:
    scan_audit_id: int
    upc: str


@frozen
class INewScanAuditRequest:
    product_type: str


@frozen
class IAddNewProductLocation:
    upc: str
    product_name: str
    planogram_id: str
    location: str
