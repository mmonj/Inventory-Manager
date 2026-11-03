from typing import NamedTuple

from reactivated import interface


@interface
class IGetProductLocationsByNameRequest(NamedTuple):
    product_name: str


@interface
class IAddUpcToScanAuditRequest(NamedTuple):
    upc: str


@interface
class ICreateNewScanAuditRequest(NamedTuple):
    product_type: str


@interface
class IAddNewProductLocationRequest(NamedTuple):
    upc: str
    product_name: str
    location: str


@interface
class ICarryOverHomeLocationsRequest(NamedTuple):
    upc: str
    planogram_ids: list[int]


@interface
class IEditPlanogramRequest(NamedTuple):
    name: str
    plano_type: str
    date_end: str | None
    planogram_text_dump: str
    is_reset_planogram: bool
    label: str


@interface
class ICreatePlanogramRequest(NamedTuple):
    name: str
    plano_type: str
    horizontal_section_thresholds: list[str] | None = None
    planogram_text_dump: str = ""
