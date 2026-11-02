from typing import NamedTuple

from django.core.exceptions import ValidationError
from django.db import transaction

from server.utils.typedefs import TFailure, TResult, TSuccess

from . import planogram_parser
from .home_locations import add_location_records
from .models import Planogram, PlanogramUpdate
from .planogram_updates import queue_planogram_update
from .types import IImportedProductInfo


class TPlanogramImport(NamedTuple):
    num_products: int
    planogram_update: PlanogramUpdate | None


def import_planogram(
    planogram: Planogram, text_dump: str, *, reset_label: str | None = None
) -> TResult[TPlanogramImport, list[str]]:
    """
    Save the planogram and add the text dump's products to it, or queue them as a planogram update
    if a reset label is given. Writes nothing when it fails.
    """
    try:
        planogram.full_clean()
    except ValidationError as ex:
        return TFailure(ex.messages)

    if reset_label is not None and not text_dump.strip():
        return TFailure(["A planogram reset needs a planogram text dump."])

    parse_result = planogram_parser.parse_data(text_dump)
    if not parse_result.ok:
        return parse_result
    product_list = parse_result.value

    with transaction.atomic():
        planogram.save()

        write_result = _add_or_queue(product_list, planogram, reset_label)
        if not write_result.ok:
            # Roll back the planogram too -- a failed text dump must not change it, or leave a new
            # one behind empty.
            transaction.set_rollback(True)
            return write_result

    return TSuccess(TPlanogramImport(len(product_list), write_result.value))


def _add_or_queue(
    product_list: list[IImportedProductInfo], planogram: Planogram, reset_label: str | None
) -> TResult[PlanogramUpdate | None, list[str]]:
    if reset_label is None:
        add_result = add_location_records(product_list, planogram)
        if not add_result.ok:
            return add_result
        return TSuccess(None)

    queue_result = queue_planogram_update(reset_label, product_list, planogram)
    if not queue_result.ok:
        return queue_result
    return TSuccess(queue_result.value)
