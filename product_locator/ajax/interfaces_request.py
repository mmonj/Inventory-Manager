from attr import frozen


@frozen
class IAppendScanAudit:
    scan_audit_id: int
    upc: str


@frozen
class INewScanAuditRequest:
    product_type: str
