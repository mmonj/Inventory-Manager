from attr import frozen


@frozen
class GetProductLocationRequest:
    upc: str
    store_id: int


@frozen
class IProductNameSearch:
    product_name: str


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
    planogram_id: int
    store_id: int
    location: str


@frozen
class ICarryOverHomeLocations:
    upc: str
    older_product_id: int
    planogram_ids: list[int]
    store_id: int


@frozen
class IEditPlanogram:
    planogram_id: int
    name: str
    plano_type: str
    date_end: str | None
    planogram_text_dump: str
    is_reset_planogram: bool
    label: str


@frozen
class ICreatePlanogram:
    name: str
    plano_type: str
    store_id: int
    horizontal_section_thresholds: list[str] | None = None
    planogram_text_dump: str = ""
