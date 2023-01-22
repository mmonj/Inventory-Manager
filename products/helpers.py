import sys
from . import models

def printerr(output, print_type=False):
    '''
    print output to stderr for testing purposes
    '''
    if print_type:
        print(f'    > Type: {type(output)}', file=sys.stderr)
    print(f'    > {repr(output)}', file=sys.stderr)


def add_store(store_name: str, contact_names: list = [], field_representative_name: str = ''):
    store, is_new_store = models.Store.objects.get_or_create(name=store_name)

    if contact_names and all(n for n in contact_names) and store.store_contact is None:
        new_contact = models.PersonnelContact.objects.create(
            first_name=contact_names[0], 
            last_name=contact_names[1]
        )
        store.store_contact = new_contact
        store.save(update_fields=['store_contact'])
    if field_representative_name and store.field_representative is None:
        field_reps = models.FieldRepresentative.objects.filter(name=field_representative_name)
        if field_reps and field_reps.count() == 1:
            store.field_representative = field_reps.first()
            store.save(update_fields=['field_representative'])
        
    return store


# import data from external categorized_store_listings.json
def import_territories(territory_info):
    for key, value in territory_info.items():
        if key == 'All Stores':
            continue

        field_representative_name = key
        store_names: list = value
        for store_name in store_names:
            manager_names = territory_info['All Stores'].get(store_name, {}).get('manager_names', [])
            add_store(store_name, contact_names=manager_names, field_representative_name=field_representative_name)


def import_products(products_info: dict):
    for parent_company, products in products_info.items():
        parent_company, is_new_parent_company = models.BrandParentCompany.objects.get_or_create(short_name=parent_company)
        for upc, info in products.items():
            product, is_new_product = models.Product.objects.get_or_create(upc=upc, name=info.get('fs_name'), parent_company=parent_company)
