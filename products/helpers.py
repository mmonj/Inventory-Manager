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
    store, new_store = models.Store.objects.get_or_create(name=store_name)

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
        
    return store or new_store


# import data from external categorized_store_listings.json
def import_employee_stores(categorized_store_listings):
    for key, value in categorized_store_listings.items():
        if key == 'All Stores':
            continue

        field_representative_name = key
        store_names: list = value
        for store_name in store_names:
            manager_names = categorized_store_listings['All Stores'].get(store_name, {}).get('manager_names', [])
            add_store(store_name, contact_names=manager_names, field_representative_name=field_representative_name)
