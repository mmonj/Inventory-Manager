import logging
import re
import time
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional

import redis
import requests
from django.conf import settings
from django.core.files import File
from django_rq import job  # type: ignore [import]
from PIL import Image, ImageChops, ImageOps

from .models import Product
from .types import IUpcItemDbData, IUpcItemDbItem

PRODUCT_LOOKUP_ENDPOINT = "https://api.upcitemdb.com/prod/trial/lookup?upc={upc_lookup_str}"
IMAGE_HOSTNAME_PREFERENCES = [
    "target.scene7.com",
    "pics.drugstore.com",
    "i5.walmartimages.com",
    "i.walmartimages.com",
    "quill.com",
    "site.unbeatablesale.com",
    "media.officedepot.com",
    "c1.neweggimages.com",
]
DOMAIN_HOSTNAME_RE = re.compile(r"^((?:http[s]?|ftp)://?)?(?:www\.)?([^:/\s]+)")
PRODUCT_IMAGE_DIMENSIONS_TARGET = (600, 600)

logger = logging.getLogger("rq.worker")

# add UPCs to Redis memory store after processing to avoid wasting precious API hits upon future worker calls
upc_to_fetch_key_template = "upc_to_fetch_{upc}"

redis_client = redis.Redis(
    host=settings.RQ_QUEUES["default"]["HOST"],
    password=settings.RQ_QUEUES["default"]["PASSWORD"],
    port=settings.RQ_QUEUES["default"]["PORT"],
    db=settings.RQ_QUEUES["default"]["DB"],
)


@job  # type:ignore [misc]
def get_external_product_images() -> None:
    logger.info("Received job to fetch product images from API")
    yesterday_date = datetime.now().date() - timedelta(days=1)
    latest_products_with_no_image = Product.objects.filter(
        date_added__gt=yesterday_date, item_image=""
    )

    logger.info("Found %s recent products with no image set", latest_products_with_no_image.count())

    products_to_fetch_image: list[Product] = [
        product
        for product in latest_products_with_no_image
        if not redis_client.exists(upc_to_fetch_key_template.format(upc=product.upc))
    ]

    logger.info("Fetching data from API for %s products", len(products_to_fetch_image))
    fetch_product_data(products_to_fetch_image)
    logger.info("Finished searching for products\n")


def add_upcs_to_redis_store(*upcs: str) -> None:
    for upc in upcs:
        logger.info("Adding %s to redis store", upc)
        upc_to_fetch_key = upc_to_fetch_key_template.format(upc=upc)
        redis_client.set(upc_to_fetch_key, 1)
        redis_client.expire(upc_to_fetch_key, timedelta(days=1))


def fetch_product_data(products_to_fetch_image: list[Product]) -> None:
    split_size = 2

    for idx in range(0, len(products_to_fetch_image), split_size):
        products = products_to_fetch_image[idx : idx + split_size]
        upc_pair = [p.upc for p in products]

        endpoint_url = PRODUCT_LOOKUP_ENDPOINT.format(upc_lookup_str=",".join(upc_pair))
        logger.info(
            "Fetching data from API for UPC pair %s at endpoint: %s", upc_pair, endpoint_url
        )
        resp: requests.Response = requests.get(endpoint_url, timeout=15)

        if resp.status_code == 429:
            logger.error("Rate limit has been hit. Waiting 60 seconds")
            time.sleep(61)
            continue
        if not resp.ok:
            logger.error(
                "Bad response: Status code %s received on lookup for UPC pair %s. Response text: %s",
                resp.status_code,
                upc_pair,
                resp.text,
            )
            break

        data: IUpcItemDbData = resp.json()
        items = data["items"]
        if not items:
            add_upcs_to_redis_store(*upc_pair)
            logger.error(
                "Response json did not have 'items' info in response for UPC pair %s", upc_pair
            )
            continue

        logger.info("Handling product data response for UPC pair: %s", upc_pair)
        handle_product_data_response(products, items)

        # API is limited to 6 requests per minute
        if (idx + 1) % 6 == 0:
            logger.info("Waiting 60 seconds in advance to avoid hitting rate limit")
            time.sleep(61)


def handle_product_data_response(products: list[Product], items: list[IUpcItemDbItem]) -> None:
    for product in products:
        product_data = next((d for d in items if d.get("upc") == product.upc), None)
        if not product_data:
            logger.info("No product data was returned by API for UPC: %s", product.upc)
            continue

        product_image_urls = product_data["images"]
        if not product_image_urls:
            logger.info("No images available for %s in lookup data", product)
            continue

        logger.info("Processing UPC %s image URL list: %s", product.upc, product_image_urls)
        product_image_urls = reorder_images_based_on_preferences(product_image_urls)
        for product_image_url in product_image_urls:
            success = download_image(product, product_image_url)
            if success:
                logger.info(
                    "Downloaded image successfully for %s. Image URL: %s",
                    product.upc,
                    product_image_url,
                )
                break
        add_upcs_to_redis_store(product.upc)


def download_image(product: Product, product_image_url: str) -> bool:
    """Download image from URL, trim any excessive border padding and resize to a smaller size

    Args:
        product (Product): model.Product instance onto which to save the image
        product_image_url (list): list<str> of image URLs

    Returns:
        bool: Indicates whether downloading from URL and processing of image was successful
    """
    logger.info(
        "Attempting to download '%s' product image from '%s'", product.upc, product_image_url
    )
    try:
        resp = requests.get(product_image_url, timeout=15)
        if not resp.ok:
            logger.error(
                "Bad response when fetching image URL content: Status Code: %s", resp.status_code
            )
            return False

        product_image = trim_and_resize_image(Image.open(BytesIO(resp.content)))
        if product_image is None:
            logger.error(
                "Trim and resize attempt returned None for %s. Moving to next product image URL",
                product_image_url,
            )
            return False

        buffer = BytesIO()
        product_image.save(buffer, format="JPEG")

        # filename 'random_image' will be ignored, file extension will be used to save to Product ImageField
        product.item_image.save("random_name.jpg", File(buffer), save=True)
    except Exception:
        logger.exception(
            "Exception occurred while retrieving/processing product image URL %s", product_image_url
        )
        return False

    return True


def reorder_images_based_on_preferences(product_image_urls: list[str]) -> list[str]:
    preferred_urls: set[str] = set()
    remaining_urls: set[str] = set()

    for preference_hostname in IMAGE_HOSTNAME_PREFERENCES:
        for image_url in product_image_urls:
            hostname_match = DOMAIN_HOSTNAME_RE.search(image_url)
            if hostname_match is None:
                logger.error("No DOMAIN_HOSTNAME_RE match found in url %s", image_url)
                continue

            hostname = hostname_match.group(2)
            if hostname == preference_hostname:
                preferred_urls.add(image_url)
            else:
                remaining_urls.add(image_url)

    return list(preferred_urls | remaining_urls)


def trim_and_resize_image(img: Image.Image) -> Optional[Image.Image]:
    def trim_borders(img: Image.Image) -> Optional[Image.Image]:
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        bg = Image.new(img.mode, img.size, img.getpixel((0, 0)))
        diff = ImageChops.difference(img, bg)
        diff = ImageChops.add(diff, diff, 2.0, -100)
        bbox = diff.getbbox()
        if bbox:
            img = img.crop(bbox)
            return ImageOps.expand(img, border=10, fill=(255, 255, 255))

        return None

    trimmed_img = trim_borders(img)
    if trimmed_img is None:
        return None

    if trimmed_img.size > PRODUCT_IMAGE_DIMENSIONS_TARGET:
        trimmed_img.thumbnail(PRODUCT_IMAGE_DIMENSIONS_TARGET, Image.Resampling.LANCZOS)
    return trimmed_img
