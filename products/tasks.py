import logging
import re
import redis
import requests
import time
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image, ImageChops, ImageOps
from django_rq import job
from django.conf import settings
from django.core.files import File

from . import models

PRODUCT_LOOKUP_ENDPOINT = 'https://api.upcitemdb.com/prod/trial/lookup?upc={upc_lookup_str}'
IMAGE_URL_PREFERENCES = [
    'target.scene7.com', 'pics.drugstore.com', 'i5.walmartimages.com', 'i.walmartimages.com',
    'quill.com', 'site.unbeatablesale.com', 'media.officedepot.com', 'c1.neweggimages.com'
]
DOMAIN_HOSTNAME_RE = re.compile(r'^((?:http[s]?|ftp)://?)?(?:www\.)?([^:/\s]+)')
PRODUCT_IMAGE_DIMENSIONS_TARGET = (600, 600)

logger = logging.getLogger("worker_logger")

# add UPCs to Redis memory store after processing to avoid wasting precious API hits upon future worker calls
upc_to_fetch_key_template = "upc_to_fetch_{upc}"

redis_client = redis.Redis(
    host=settings.RQ_QUEUES["default"]["HOST"],
    port=settings.RQ_QUEUES["default"]["PORT"],
    db=settings.RQ_QUEUES["default"]["DB"]
)


@job
def get_external_product_images():
    logger.info("Received job to fetch product images from API")
    yesterday_date = datetime.now().date() - timedelta(days=1)
    latest_products_with_no_image = models.Product.objects.filter(
        date_added__gt=yesterday_date, item_image="")

    logger.info(f"Found {latest_products_with_no_image.count()} recent products with no image set")

    products_to_fetch_image = [
        product for product in latest_products_with_no_image
        if not redis_client.exists(upc_to_fetch_key_template.format(upc=product.upc))
    ]

    logger.info(f"Fetching data from API for {len(products_to_fetch_image)} products")
    fetch_product_data(products_to_fetch_image)
    logger.info("Finished searching for products\n")


def add_upcs_to_redis_store(*upcs):
    for upc in upcs:
        logger.info(f"Adding {upc} to redis store")
        upc_to_fetch_key = upc_to_fetch_key_template.format(upc=upc)
        redis_client.set(upc_to_fetch_key, 1)
        redis_client.expire(upc_to_fetch_key, timedelta(days=1))


def fetch_product_data(products_to_fetch_image: list):
    split_size = 2

    for idx in range(0, len(products_to_fetch_image), split_size):
        products = products_to_fetch_image[idx:idx + split_size]
        upc_pair = [p.upc for p in products]

        endpoint_url = PRODUCT_LOOKUP_ENDPOINT.format(upc_lookup_str=','.join(upc_pair))
        logger.info(f'Fetching data from API for UPC pair {upc_pair} at endpoint: {endpoint_url}')
        resp = requests.get(endpoint_url)

        if resp.status_code == 429:
            logger.info("Rate limit has been hit. Waiting 60 seconds")
            time.sleep(61)
            continue
        if not resp.ok:
            logger.info(f'Status code {resp.status_code} received on lookup for UPC pair {upc_pair}. \
                        Response text: {resp.text}')
            break

        items_data = resp.json().get('items', [])
        if not items_data:
            add_upcs_to_redis_store(*upc_pair)
            logger.info(f'Response json did not have "items" info in response for UPC pair {upc_pair}')
            continue

        logger.info(f"Handling product data response for UPC pair: {upc_pair}")
        handle_product_data_response(products, items_data)

        # API is limited to 6 requests per minute
        if (idx + 1) % 6 == 0:
            logger.info("Waiting 60 seconds in advance to avoid hitting rate limit")
            time.sleep(61)


def handle_product_data_response(products: list, items_data: list):
    for product in products:
        data = next((d for d in items_data if d.get("upc") == product.upc), None)
        if not data:
            logger.info(f"No product data was returned by API for UPC: {product.upc}")
            continue

        product_image_urls = data["images"]
        if not product_image_urls:
            logger.info(f'No images available for {product} in lookup data')
            continue

        logger.info(f"Processing UPC {product.upc} image URL list: {product_image_urls}")
        product_image_urls = reorder_images_based_on_preferences(product_image_urls)
        for product_image_url in product_image_urls:
            success = download_image(product, product_image_url)
            if success:
                logger.info(f"Download image successfully for {product.upc}. Image URL: {product_image_url}")
                break
        add_upcs_to_redis_store(product.upc)


def download_image(product: models.Product, product_image_url: list) -> bool:
    """Download image from URL, trim any excessive border padding and resize to a smaller size

    Args:
        product (models.Product): model.Product instance onto which to save the image
        product_image_url (list): list<str> of image URLs

    Returns:
        bool: Indicates whether downloading from URL and processing of image was successful
    """
    logger.info(f'Attempting to download "{product.upc}" product image from "{product_image_url}"')
    try:
        resp = requests.get(product_image_url)
        if not resp.ok:
            logger.info(f"Bad response when fetching image URL content: Status Code: {resp.status_code}")
            return False

        product_image = Image.open(BytesIO(resp.content))
        product_image = trim_and_resize_image(product_image)
        if product_image is None:
            logger.info(
                f"Trim and resize attempt returned None for {product_image_url}. Moving to next product image URL")
            return False

        buffer = BytesIO()
        product_image.save(buffer, format='JPEG')

        # filename 'random_image' will be ignored, file extension will be used to save to Product ImageField
        product.item_image.save("random_name.jpg", File(buffer), save=True)
    except Exception as e:
        logger.exception(
            f'Exception occurred while retrieving/processing product image URL {product_image_url}: {e}')
        return False

    return True


def reorder_images_based_on_preferences(product_image_urls: list):
    result = []
    num_matches = 0
    for image_url in product_image_urls:
        hostname = DOMAIN_HOSTNAME_RE.search(image_url).group(2)
        if hostname in IMAGE_URL_PREFERENCES:
            result.insert(num_matches, image_url)
            num_matches += 1
        else:
            result.append(image_url)

    return result


def trim_and_resize_image(img: object) -> object:
    def trim_borders(img):
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        bg = Image.new(img.mode, img.size, img.getpixel((0, 0)))
        diff = ImageChops.difference(img, bg)
        diff = ImageChops.add(diff, diff, 2.0, -100)
        bbox = diff.getbbox()
        if bbox:
            img = img.crop(bbox)
            img = ImageOps.expand(img, border=10, fill=(255, 255, 255))
            return img

        return None

    img = trim_borders(img)
    if img is None:
        return None

    if img.size > PRODUCT_IMAGE_DIMENSIONS_TARGET:
        img.thumbnail(PRODUCT_IMAGE_DIMENSIONS_TARGET, Image.ANTIALIAS)
    return img
