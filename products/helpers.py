import sys
from . import models

def printerr(output):
    '''
    print output to stderr for testing purposes
    '''
    print(f'    > Type: {type(output)}', file=sys.stderr)
    print(f'    > {repr(output)}', file=sys.stderr)


def add_store(store_name: str, contact_name: list = [], field_representative: str = ''):
    existing_store, new_store = models.Store.objects.get_or_create(name=store_name)
    