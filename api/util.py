import logging
from typing import Optional, TypeVar

from products.models import BrandParentCompany, Product, ProductAddition, Store
from products.util import get_current_work_cycle, get_num_work_cycles_offset

from .types import IGetStoreProductAdditions, IProduct

logger = logging.getLogger("main_logger")
T = TypeVar("T")


def update_product_record_names(
    request_data: IGetStoreProductAdditions, parent_company: BrandParentCompany
) -> list[str]:
    """Bulk create products if they don't already exist.
    Bulk update existing products with product name if they don't contain it

    Args:
        request_data (IGetStoreProductAdditions): request json payload received from client
        parent_company (BrandParentCompany): db record of BrandParentCompany

    Returns:
        tuple: tuple<str> of sorted UPC numbers
    """

    def get_product_name(upc: str, products: list[IProduct]) -> Optional[str]:
        for product_info in products:
            if product_info.raw_upc == upc:
                return product_info.name
        return None

    upcs = [p.raw_upc for p in request_data.products]

    # bulk create products
    new_products = []
    for product_info in request_data.products:
        temp_product = Product(
            upc=product_info.raw_upc, name=product_info.name, parent_company=parent_company
        )
        if not temp_product.is_valid_upc():
            logger.info("Invalid UPC %s for '%s'. Skipping", temp_product.upc, temp_product.name)
            continue
        new_products.append(temp_product)

    logger.info("Bulk creating %s products", len(new_products))
    Product.objects.bulk_create(new_products, ignore_conflicts=True)

    # bulk update products with no name
    products_with_no_name = Product.objects.filter(upc__in=upcs, name=None)

    for product in products_with_no_name:
        product.parent_company = parent_company
        product.name = get_product_name(product.upc, request_data.products)

    products_with_no_name.bulk_update(products_with_no_name, ["parent_company", "name"])

    return upcs


def update_product_additions(
    store: Store, parent_company: BrandParentCompany, normalized_upcs: list[str]
) -> list[ProductAddition]:
    """Bulk create ProductAddition records if they don't already exist

    Args:
        store (products.Store): products.Store instance
        parent_company (BrandParentCompany): Parent Company record
        normalized_upcs (list[str]): list of full (proper 12-digit) UPC numbers

    Returns:
        list: list of products.ProductAddition that match the UPCs present in request_json
    """

    products = Product.objects.filter(upc__in=normalized_upcs, parent_company=parent_company).all()
    new_product_additions = [ProductAddition(store=store, product=p) for p in products]

    logger.info("Bulk creating %s product additions", len(new_product_additions))
    ProductAddition.objects.bulk_create(new_product_additions, ignore_conflicts=True)

    product_additions = ProductAddition.objects.filter(
        store=store, product__upc__in=normalized_upcs
    ).select_related("store", "product")

    for product_addition in product_additions:
        if product_addition.date_ordered is None:
            continue

        num_cycles_offset = get_num_work_cycles_offset(
            product_addition.date_ordered, get_current_work_cycle()
        )

        if product_addition.is_carried is False and num_cycles_offset > 0:
            product_addition.is_carried = True
            product_addition.save(update_fields=["is_carried"])

    return list(product_additions)
