import logging
import zipfile
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Generator, List, Optional, Set

import pytz
from django.core.exceptions import ValidationError
from django.core.files import File

from .models import (
    BrandParentCompany,
    FieldRepresentative,
    PersonnelContact,
    Product,
    ProductAddition,
    Store,
    WorkCycle,
)
from .types import (
    BasicStoreInfo,
    ImportedFieldRepInfo,
    ImportedProductInfo,
    ImportedProductStockData,
    ImportedStoreData,
)

logger = logging.getLogger("main_logger")

WORK_CYCLE_TIME_SPAN = timedelta(weeks=2)


def import_field_reps(field_reps_info: dict[str, ImportedFieldRepInfo]) -> None:
    new_field_reps = []
    for field_rep_name, rep_info in field_reps_info.items():
        work_email = rep_info["work_email"]
        new_field_reps.append(FieldRepresentative(name=field_rep_name, work_email=work_email))

    FieldRepresentative.objects.bulk_create(new_field_reps, ignore_conflicts=True)


def import_new_stores(stores: list[str]) -> None:
    """bulk adds list of stores to database

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


def import_territories(territory_info: dict[str, Any]) -> None:
    all_stores: dict[str, ImportedStoreData] = territory_info["All Stores"]
    field_rep_territories = {
        name: territory_info[name] for name in territory_info if name != "All Stores"
    }

    new_stores: list[Store] = []
    new_contacts: Generator[PersonnelContact, None, None]
    stores_with_contacts = {}

    logger.info("Importing territories")
    for field_rep_name, store_list in field_rep_territories.items():
        field_rep = FieldRepresentative.objects.get(name=field_rep_name)
        for store_name in store_list:
            new_stores.append(Store(name=store_name, field_representative=field_rep))
    for store_name, store_info in all_stores.items():
        new_stores.append(Store(name=store_name))
        manager_names = store_info.get("manager_names")
        if manager_names and all(manager_names):
            stores_with_contacts[store_name] = manager_names

    Store.objects.bulk_create(new_stores, batch_size=100, ignore_conflicts=True)

    stores = Store.objects.filter(name__in=stores_with_contacts.keys())
    new_contacts = (
        PersonnelContact(
            first_name=stores_with_contacts[store.name][0],
            last_name=stores_with_contacts[store.name][1],
            store=store,
        )
        for store in stores
    )

    PersonnelContact.objects.bulk_create(new_contacts, batch_size=100)


def import_products(
    products_info: dict[str, dict[str, ImportedProductInfo]],
    images_zip_path: Optional[str] = None,
    brand_logos_zip: Optional[bytes] = None,
) -> None:
    # new_products = []
    for client_brand, products_dict in products_info.items():
        logger.info(f"Importing products for: {client_brand}")
        parent_company = BrandParentCompany.objects.get_or_create(short_name=client_brand)[0]

        new_products = (
            Product(
                upc=upc,
                name=product_info["fs_name"],
                parent_company=parent_company,
                date_added=datetime.fromtimestamp(0),
            )
            for upc, product_info in products_dict.items()
            if Product(upc=upc).is_valid_upc()
        )

        Product.objects.bulk_create(new_products, batch_size=100, ignore_conflicts=True)

    if brand_logos_zip is not None:
        logger.info("Importing brand logos")
        brands = BrandParentCompany.objects.distinct("short_name").in_bulk(field_name="short_name")
        with zipfile.ZipFile(BytesIO(brand_logos_zip)) as zf:
            for filename in zf.namelist():
                short_name = Path(filename).stem
                if short_name in brands and not brands[short_name].third_party_logo:
                    with zf.open(filename, "r") as fd:
                        brands[short_name].third_party_logo.save(filename, File(fd), save=True)

    if images_zip_path is not None:
        logger.info("Importing product images")
        products = Product.objects.distinct("upc").in_bulk(field_name="upc")
        with zipfile.ZipFile(images_zip_path) as zf:
            for filename in zf.namelist():
                upc = Path(filename).stem
                if upc in products and not products[upc].item_image:
                    with zf.open(filename, "r") as fd:
                        products[upc].item_image.save(filename, File(fd), save=True)


def import_distribution_data(
    stores_distribution_data: dict[str, dict[str, ImportedProductStockData]]
) -> None:
    for idx, (store_name, store_distribution_data) in enumerate(stores_distribution_data.items()):
        len1 = len(stores_distribution_data)
        store = Store.objects.get_or_create(name=store_name)[0]
        logger.info(f"{idx + 1}/{len1} - Store: {store_name}")

        ####
        new_products = (
            Product(upc=upc, date_added=datetime.fromtimestamp(0))
            for upc, product_distribution_data in store_distribution_data.items()
            if Product(upc=upc).is_valid_upc()
        )

        Product.objects.bulk_create(new_products, batch_size=100, ignore_conflicts=True)
        # products = Product.objects.filter(upc__in=store_distribution_data.keys())
        products = Product.objects.in_bulk(store_distribution_data.keys(), field_name="upc")

        new_product_additions = (
            ProductAddition(
                # product=get_product_from_queryset(products, upc),
                product=products.get(upc),
                # product = products.filter(upc=upc).first(),
                store=store,
                date_added=datetime.fromtimestamp(
                    product_distribution_data.get("time_added", 0), timezone.utc
                ),
                date_last_scanned=get_utc_datetime(product_distribution_data.get("date_scanned")),
                is_carried=product_distribution_data.get("instock", False),
            )
            for upc, product_distribution_data in store_distribution_data.items()
            if Product(upc=upc).is_valid_upc()
        )

        ProductAddition.objects.bulk_create(
            new_product_additions, batch_size=100, ignore_conflicts=True
        )


def get_product_from_queryset(products: List[Product], upc: str) -> Optional[Product]:
    result: List[Product] = list(filter(lambda p: p.upc == upc, products))
    if not result:
        return None
    return result[0]


def get_missing_products(upcs_batch: list[str], products: list[Product]) -> list[str]:
    """Determines which UPCs in `upcs_batch` are not present in `products`

    Args:
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


def get_utc_datetime(datetime_str: Optional[str]) -> datetime:
    if datetime_str is None:
        return datetime.fromtimestamp(0, timezone.utc)

    datetime_object = datetime.strptime(datetime_str, "%Y-%m-%d at %I:%M:%S %p")

    est = pytz.timezone("EST")
    local_time = est.localize(datetime_object)
    utc_time = local_time.astimezone(pytz.utc)

    return utc_time


def get_store_count(territory_info: dict[str, Any]) -> int:
    store_names_set: Set[str] = set(territory_info["All Stores"].keys())

    for rep_name, store_names_list in territory_info.items():
        if rep_name == "All Stores":
            continue

        for store_name in store_names_list:
            store_names_set.add(store_name)

    return len(store_names_set)


def get_stores_managers_dict(territory_info: dict[str, Any]) -> dict[str, BasicStoreInfo]:
    # {store_name : {'first_name': '', 'last_name': ''}, {}, {}, ...}
    stores_info: dict[str, BasicStoreInfo] = {}
    for store_name, store_info in territory_info["All Stores"].items():
        manager_names = store_info.get("manager_names")
        if manager_names and all(manager_names):
            stores_info[store_name] = {
                "first_name": manager_names[0],
                "last_name": manager_names[1],
            }
    return stores_info


def get_product_count(
    products_info: dict[str, dict[str, ImportedProductInfo]],
    stores_distribution_data: dict[str, dict[str, ImportedProductStockData]],
) -> int:
    upcs = set()
    for products_dict in products_info.values():
        for upc in products_dict:
            _temp_product = Product(upc=upc)
            try:
                _temp_product.clean()
                upcs.add(upc)
            except ValidationError:
                continue

    for distribution_data in stores_distribution_data.values():
        for upc in distribution_data:
            _temp_product = Product(upc=upc)
            try:
                _temp_product.clean()
                upcs.add(upc)
            except ValidationError:
                continue

    return len(upcs)


def get_product_additions_count(
    stores_distribution_data: dict[str, dict[str, ImportedProductStockData]]
) -> int:
    product_addition_set = set()
    for store_name, store_data in stores_distribution_data.items():
        for upc, product_data in store_data.items():
            try:
                product = Product(upc=upc)
                product.clean()
                product_addition_set.add(
                    (
                        store_name,
                        upc,
                    )
                )
            except ValidationError:
                continue
    return len(product_addition_set)


def is_date_within_work_cycle(date_in_question: date, work_cycle: WorkCycle) -> bool:
    return work_cycle.start_date <= date_in_question and date_in_question <= work_cycle.end_date


def get_num_work_cycles_offset(date_in_question: date, work_cycle: WorkCycle) -> int:
    if is_date_within_work_cycle(date_in_question, work_cycle):
        return 0

    num_adjustment = 1
    if date_in_question < work_cycle.end_date:
        num_adjustment = 0

    num_cycles_offset = int((date_in_question - work_cycle.end_date) / WORK_CYCLE_TIME_SPAN)

    return abs(num_cycles_offset) + num_adjustment


def get_current_work_cycle() -> WorkCycle:
    """Get the latest WorkCycle instance; return if today's date is within existing work cycle's date intervals
        else create a new WorkCycle record and return that

    Returns:
        products.WorkCycle: latest products.WorkCycle instance
    """
    today_date = date.today()
    latest_work_cycle = WorkCycle.objects.latest("end_date")

    if is_date_within_work_cycle(today_date, latest_work_cycle):
        return latest_work_cycle

    num_cycles_offset = get_num_work_cycles_offset(today_date, latest_work_cycle)

    new_work_cycle = WorkCycle(
        start_date=latest_work_cycle.start_date + (num_cycles_offset * WORK_CYCLE_TIME_SPAN),
        end_date=latest_work_cycle.end_date + (num_cycles_offset * WORK_CYCLE_TIME_SPAN),
    )

    new_work_cycle.save()
    return new_work_cycle
