import json
from pathlib import Path
from typing import Any


def get_json(file_name: str) -> Any:
    file = Path(__file__).with_name(file_name)
    with open(file, "r", encoding="utf8") as fd:
        return json.load(fd)


def get_field_reps_info() -> Any:
    return get_json("field_reps.json")


def get_territory_info() -> Any:
    return get_json("categorized_store_listings.json")


def get_products_info() -> Any:
    return get_json("product_names.json")


def get_store_distribution_data() -> Any:
    return get_json("stores_data_quick_route.json")
