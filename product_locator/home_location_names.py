import re

LOCATION_PATTERN = r"[A-Z][0-9]{1,3}"


def normalize_location_name(name: str) -> str:
    return name.strip().upper()


def is_valid_home_location_name(normalized_name: str) -> bool:
    return re.fullmatch(LOCATION_PATTERN, normalized_name) is not None
