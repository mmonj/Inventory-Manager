import json
from pathlib import Path

from django.core.files.storage import default_storage


def get_json(file_name):
    file = Path(__file__).with_name(file_name)
    with open(file, 'r', encoding='utf8') as fd:
        return json.load(fd)


def get_field_reps_info():
    return get_json('field_reps.json')


def get_territory_info():
    return get_json('categorized_store_listings.json')


def get_products_info():
    return get_json('product_names.json')


def get_store_distribution_data():
    return get_json('stores_data_quick_route.json')
