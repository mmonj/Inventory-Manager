import logging
from typing import Any, List, Optional, Type, TypeVar

import cattrs

from .types import GetStoreAdditionsInterface, ProductInterface
from products.models import BrandParentCompany, Product, ProductAddition, Store

from rest_framework.exceptions import ValidationError


logger = logging.getLogger("main_logger")
T = TypeVar("T")


def update_product_names(
    request_data: GetStoreAdditionsInterface, parent_company: BrandParentCompany
) -> List[str]:
    """Bulk create products if they don't already exist.
    Bulk update existing products with product name if they don't contain it

    Args:
        request_json (dict): request json payload received from client

    Returns:
        tuple: tuple<str> of sorted UPC numbers
    """

    def get_product_name(upc: str, products: List[ProductInterface]) -> Optional[str]:
        for product_info in products:
            if product_info["upc"] == upc:
                return product_info["name"]
        return None

    upcs = [p["upc"] for p in request_data["products"]]

    # bulk create products
    new_products = []
    for product_info in request_data["products"]:
        temp_product = Product(
            upc=product_info["upc"], name=product_info["name"], parent_company=parent_company
        )
        if not temp_product.is_valid_upc():
            logger.info(f"Invalid UPC {temp_product.upc}. Skipping")
            continue
        new_products.append(temp_product)

    logger.info(f"Bulk creating {len(new_products)} products")
    new_products = Product.objects.bulk_create(new_products, ignore_conflicts=True)

    # bulk update products with no name
    products = Product.objects.filter(upc__in=upcs, name=None)

    for product in products:
        product.parent_company = parent_company
        product.name = get_product_name(product.upc, request_data["products"])

    products.bulk_update(products, ["parent_company", "name"])

    return sorted(upcs)


def update_product_additions(
    store: Store, request_data: GetStoreAdditionsInterface
) -> List[ProductAddition]:
    """Bulk create ProductAddition records if they don't already exist

    Args:
        store (products.Store): products.Store instance
        request_json (dict): request json payload received from client

    Returns:
        list: list of products.ProductAddition that match the UPCs present in request_json
    """
    upcs = [p["upc"] for p in request_data["products"]]
    products = Product.objects.filter(upc__in=upcs)
    new_product_additions = []

    for product in products:
        temp_product_addition = ProductAddition(store=store, product=product)
        new_product_additions.append(temp_product_addition)

    logger.info(f"Bulk creating {len(new_product_additions)} product additions")
    ProductAddition.objects.bulk_create(new_product_additions, ignore_conflicts=True)

    return list(
        ProductAddition.objects.filter(store=store, product__upc__in=upcs).select_related(
            "store", "product"
        )
    )


def validate_structure(data: dict[str, Any], interfaceClass: Type[T]) -> T:
    try:
        obj = cattrs.structure(data, interfaceClass)
    except cattrs.ClassValidationError:
        raise ValidationError
    except ValueError:
        raise ValidationError

    return obj
