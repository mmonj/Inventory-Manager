import logging
from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone as dj_timezone

from ..models import Product, Store, WorkCycle

logger = logging.getLogger("main_logger")

WORK_CYCLE_TIME_SPAN = timedelta(weeks=2)


def import_new_stores(stores: list[str]) -> None:
    """
    Bulk adds list of stores to database

    Args:
        stores (list): list<str> of store names
    """
    new_stores = []
    for store_name in stores:
        try:
            new_store = Store(name=store_name)
            new_store.clean()
            new_stores.append(new_store)
        except ValidationError:
            continue

    Store.objects.bulk_create(new_stores, batch_size=100, ignore_conflicts=True)


def get_product_from_queryset(products: list[Product], upc: str) -> Product | None:
    result: list[Product] = list(filter(lambda p: p.upc == upc, products))
    if not result:
        return None
    return result[0]


def get_missing_products(upcs_batch: list[str], products: list[Product]) -> list[str]:
    """
    Determines which UPCs in `upcs_batch` are not present in `products`

    Args:
        upcs_batch (list[str]): _
        products (list): List of `Product`

    Returns:
        list: List of `str`
    """
    missing_upcs = []
    for upc in upcs_batch:
        if not any(p.upc == upc for p in products):
            try:
                _temp_product = Product(upc=upc)
                _temp_product.clean()
                missing_upcs.append(upc)
            except ValidationError:
                continue
    return missing_upcs


def is_date_within_work_cycle(date_in_question: date, work_cycle: WorkCycle) -> bool:
    return work_cycle.start_date <= date_in_question <= work_cycle.end_date


def get_num_work_cycles_offset(date_in_question: date, work_cycle: WorkCycle) -> int:
    if is_date_within_work_cycle(date_in_question, work_cycle):
        return 0

    num_adjustment = 1
    if date_in_question < work_cycle.end_date:
        num_adjustment = 0

    num_cycles_offset = int((date_in_question - work_cycle.end_date) / WORK_CYCLE_TIME_SPAN)

    return abs(num_cycles_offset) + num_adjustment


def get_current_work_cycle() -> WorkCycle:
    """
    Get the latest WorkCycle instance; return if today's date is within existing work cycle's date intervals
        else create a new WorkCycle record and return that

    Returns:
        products.WorkCycle: latest products.WorkCycle instance
    """
    # localdate(), not now().date() -- now() is UTC-aware, and .date() on it extracts the UTC
    # date rather than the local (TIME_ZONE) wall-clock date, which rolled cycles over up to
    # ~4-5 hours early (e.g. Saturday 9pm EST/EDT already reading as Sunday in UTC).
    today_date = dj_timezone.localdate()
    latest_work_cycle = WorkCycle.objects.order_by("-end_date").first()
    if latest_work_cycle is None:
        raise ValueError("No latest work cycle available")

    if latest_work_cycle.start_date > today_date:
        raise ValueError(f"Latest work cycle is in the future: {latest_work_cycle}")

    if is_date_within_work_cycle(today_date, latest_work_cycle):
        return latest_work_cycle

    num_cycles_offset = get_num_work_cycles_offset(today_date, latest_work_cycle)

    new_work_cycles: list[WorkCycle] = []
    for offset in range(1, num_cycles_offset + 1):
        new_work_cycle = WorkCycle(
            start_date=latest_work_cycle.start_date + (offset * WORK_CYCLE_TIME_SPAN),
            end_date=latest_work_cycle.end_date + (offset * WORK_CYCLE_TIME_SPAN),
        )

        new_work_cycles.append(new_work_cycle)

    new_work_cycles = WorkCycle.objects.bulk_create(new_work_cycles)

    return new_work_cycles[-1]
