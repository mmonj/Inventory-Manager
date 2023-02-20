import logging
import pytz
import zipfile

from . import models
from datetime import datetime, timezone, timedelta, date
from itertools import islice
from pathlib import Path

from django.core.files import File
from django.core.exceptions import ValidationError

logger = logging.getLogger('main_logger')


def import_field_reps(field_reps_info: dict):
    new_field_reps = []
    for field_rep_name, rep_info in field_reps_info.items():
        work_email = rep_info['work_email']
        new_field_reps.append(models.FieldRepresentative(name=field_rep_name, work_email=work_email))

    models.FieldRepresentative.objects.bulk_create(new_field_reps)


def bulk_create_in_batches(TargetModelClass, objs: iter, batch_size=100, ignore_conflicts=False):
    while True:
        batch = list(islice(objs, batch_size))
        if not batch:
            break
        TargetModelClass.objects.bulk_create(batch, batch_size, ignore_conflicts=ignore_conflicts)


def add_new_stores(stores: list):
    """bulk adds list of stores to database

    Args:
        stores (list): list<str> of store names
    """
    new_stores = []
    for store_name in stores:
        try:
            new_store = models.Store(name=store_name)
            new_store.clean()
            new_stores.append(new_store)
        except ValidationError:
            continue

    bulk_create_in_batches(models.Store, iter(new_stores), ignore_conflicts=True)


def import_territories(territory_info: dict):
    all_stores: dict = territory_info['All Stores']
    field_rep_territories = {name: territory_info[name] for name in territory_info if name != 'All Stores'}

    new_stores = []
    new_contacts = []
    stores_with_contacts = {}

    logger.info('Importing territories')
    for field_rep_name, store_list in field_rep_territories.items():
        field_rep = models.FieldRepresentative.objects.get(name=field_rep_name)
        for store_name in store_list:
            new_stores.append(models.Store(name=store_name, field_representative=field_rep))
    for store_name, store_info in all_stores.items():
        new_stores.append(models.Store(name=store_name))
        manager_names = store_info.get('manager_names')
        if manager_names and all(manager_names):
            stores_with_contacts[store_name] = manager_names
    bulk_create_in_batches(models.Store, iter(new_stores), batch_size=100, ignore_conflicts=True)

    stores = models.Store.objects.filter(name__in=stores_with_contacts.keys())
    new_contacts = (
        models.PersonnelContact(
            first_name=stores_with_contacts[store.name][0],
            last_name=stores_with_contacts[store.name][1],
            store=store
        )
        for store in stores
    )
    bulk_create_in_batches(models.PersonnelContact, new_contacts, batch_size=100)


def import_products(products_info: dict, images_zip_path=None):
    # new_products = []
    for client_brand, products_dict in products_info.items():
        logger.info(f'Importing products for: {client_brand}')
        parent_company = models.BrandParentCompany.objects.get_or_create(short_name=client_brand)[0]

        new_products = (
            models.Product(
                upc=upc,
                name=product_info['fs_name'],
                parent_company=parent_company
            )
            for upc, product_info in products_dict.items()
            if models.Product(upc=upc).is_valid_upc()
        )
        bulk_create_in_batches(models.Product, new_products, batch_size=100, ignore_conflicts=True)

    if images_zip_path is None:
        return

    products = models.Product.objects.distinct('upc').in_bulk(field_name='upc')
    with zipfile.ZipFile(images_zip_path) as zf:
        for filename in zf.namelist():
            upc = Path(filename).stem
            if upc in products:
                with zf.open(filename, "r") as f:
                    file_obj = File(f)
                    products[upc].item_image.save(filename, file_obj, save=True)


def import_distribution_data(stores_distribution_data: dict):
    for idx, (store_name, store_distribution_data) in enumerate(stores_distribution_data.items()):
        len1 = len(stores_distribution_data)
        store = models.Store.objects.get_or_create(name=store_name)[0]
        logger.info(f'{idx + 1}/{len1} - Store: {store_name}')

        ####
        new_products = (
            models.Product(upc=upc)
            for upc, product_distribution_data in store_distribution_data.items()
            if models.Product(upc=upc).is_valid_upc()
        )

        bulk_create_in_batches(models.Product, new_products, batch_size=100, ignore_conflicts=True)
        # products = models.Product.objects.filter(upc__in=store_distribution_data.keys())
        products = models.Product.objects.in_bulk(store_distribution_data.keys(), field_name='upc')

        new_product_additions = (
            models.ProductAddition(
                # product=get_product_from_queryset(products, upc),
                product=products.get(upc),
                # product = products.filter(upc=upc).first(),
                store=store,
                date_added=datetime.fromtimestamp(product_distribution_data.get('time_added', 0), timezone.utc),
                date_last_scanned=get_utc_datetime(product_distribution_data.get('date_scanned')),
                is_carried=product_distribution_data.get('instock', False)
            )
            for upc, product_distribution_data in store_distribution_data.items()
            if models.Product(upc=upc).is_valid_upc()
        )
        bulk_create_in_batches(models.ProductAddition, new_product_additions, batch_size=100, ignore_conflicts=True)


def get_product_from_queryset(products, upc) -> models.Product:
    result = list(filter(lambda p: p.upc == upc, products))
    if not result:
        return None
    return result[0]


def get_missing_products(upcs_batch: list, products: list) -> list:
    """Determines which UPCs in `upcs_batch` are not present in `products`

    Args:
        products (list): List of `models.Product`

    Returns:
        list: List of `str`
    """
    missing_upcs = []
    for upc in upcs_batch:
        if not any(p.upc == upc for p in products):
            try:
                _temp_product = models.Product(upc=upc)
                _temp_product.clean()
                missing_upcs.append(upc)
            except ValidationError:
                continue
    return missing_upcs


def get_utc_datetime(datetime_str: str) -> datetime:
    if datetime_str is None:
        return datetime.fromtimestamp(0, timezone.utc)

    datetime_object = datetime.strptime(datetime_str, "%Y-%m-%d at %I:%M:%S %p")

    est = pytz.timezone("EST")
    local_time = est.localize(datetime_object)
    utc_time = local_time.astimezone(pytz.utc)

    return utc_time


def get_store_count(territory_info: dict) -> int:
    store_names_set = set(territory_info['All Stores'].keys())

    for rep_name, store_names_list in territory_info.items():
        if rep_name == 'All Stores':
            continue

        for store_name in store_names_list:
            store_names_set.add(store_name)

    return len(store_names_set)


def get_stores_managers_dict(territory_info: dict) -> dict:
    stores_info = {}    # {store_name : {'first_name': '', 'last_name': ''}, {}, {}, ...}
    for store_name, store_info in territory_info['All Stores'].items():
        manager_names = store_info.get('manager_names')
        if manager_names and all(manager_names):
            stores_info[store_name] = {
                'first_name': manager_names[0],
                'last_name': manager_names[1]
            }
    return stores_info


def get_product_count(products_info: dict, stores_distribution_data: dict) -> int:
    upcs = set()
    for products_dict in products_info.values():
        for upc in products_dict:
            _temp_product = models.Product(upc=upc)
            try:
                _temp_product.clean()
                upcs.add(upc)
            except ValidationError:
                continue

    for distribution_data in stores_distribution_data.values():
        for upc in distribution_data:
            _temp_product = models.Product(upc=upc)
            try:
                _temp_product.clean()
                upcs.add(upc)
            except ValidationError:
                continue

    return len(upcs)


def get_product_additions_count(stores_distribution_data) -> int:
    product_addition_set = set()
    for store_name, store_data in stores_distribution_data.items():
        for upc, product_data in store_data.items():
            try:
                product = models.Product(upc=upc)
                product.clean()
                product_addition_set.add((store_name, upc, ))
            except ValidationError:
                continue
    return len(product_addition_set)


def get_current_work_cycle():
    """Get the (only) current WorkCycle instance and adjust its time span if the current date is outside of it

    Returns:
        products.models.WorkCycle: latest products.models.WorkCycle instance
    """
    work_cycle = models.WorkCycle.objects.all().first()

    if date.today() > work_cycle.end_date:
        work_cycle_time_span = timedelta(weeks=2)

        num_cycles_offset = (date.today() - work_cycle.end_date) / work_cycle_time_span
        num_cycles_offset = int(num_cycles_offset) + 1

        work_cycle.end_date += work_cycle_time_span * num_cycles_offset
        work_cycle.start_date += work_cycle_time_span * num_cycles_offset

        work_cycle.save(update_fields=['start_date', 'end_date'])

    return work_cycle
