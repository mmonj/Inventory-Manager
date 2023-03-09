import logging
import re
from natsort import natsorted

logger = logging.getLogger("main_logger")

# ITEM_ATTRIBUTES_RE = r"(.+?)[ \t]+(\d{12})(?:[ \t]+\d)?[ \t]+([a-z]\d+)"
ITEM_ATTRIBUTES_RE = re.compile(
    r"(.+?)[ \t]+(\d{12})(?:[ \t]+\w)?[ \t]+(\w{2,3})[ \t]*", flags=re.MULTILINE | re.IGNORECASE)
LOCATION_RE = re.compile(r"\b[a-z][0-9][0-9]?\b", flags=re.IGNORECASE)

COMMON_OCR_CHAR_ERRORS = {
    '0': ['O', 'o'],
    '1': ['I', 'l', 'i'],
    '2': ['Z', 'z'],
    '3': ['B'],
    '4': ['A'],
    '5': ['S', 's'],
    '6': ['G'],
    '7': ['T'],
    '8': ['B'],
    '9': ['g', 'q']
}


def parse_data(planogram_text_dump: str) -> list:
    matches = re.finditer(ITEM_ATTRIBUTES_RE, planogram_text_dump)
    product_list = []

    for match in matches:
        name: str = match.group(1)
        upc: str = match.group(2)
        location: str = match.group(3)

        product_list.append(
            {
                "upc": upc.strip(),
                "name": name.strip(),
                "location": fix_location_ocr_inaccuracies(location.strip())
            }
        )

    assert_unique(product_list, "upc", key=lambda e: e["upc"])
    assert_unique(product_list, "location", key=lambda e: e["location"])

    return natsorted(product_list, key=lambda p: p["location"], reverse=True)


def assert_unique(product_list, unique_type, key=None):
    if key is None:
        return

    uniques = set()
    for product in product_list:
        value = key(product)

        assert value not in uniques, f"{unique_type} duplicate found: {value} --> {product}"
        uniques.add(value)

    logger.info(f"Validated as unique all {unique_type} values")


def fix_location_ocr_inaccuracies(location: str) -> str:
    """fix OCR inaccuracies for the 2-3 letter product location string

    Args:
        location (str): product location string (location on planogram)

    Returns:
        str: product location string (location on planogram) with OCR fixes applied
    """
    if LOCATION_RE.match(location):
        return location

    assert len(location) in [2, 3], f"Location string '{location}' is not the right length"

    result = ""
    for idx, char in enumerate(location):
        if idx == 0 and char.isnumeric():
            result += COMMON_OCR_CHAR_ERRORS.get(char, [char])[0]
        elif idx > 0 and char.isalpha():
            fixed_char = get_numeric_ocr_char(char)
            assert fixed_char is not None, f"Error in attempt to fix location {location}; "\
                f"fix not found for char: {char}"

            result += fixed_char
        else:
            result += char

    return result


def get_numeric_ocr_char(char):
    for number, char_list in COMMON_OCR_CHAR_ERRORS.items():
        if char in char_list:
            return number

    return None