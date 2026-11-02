import logging
import re

from checkdigit import gs1
from natsort import natsorted

from server.utils.typedefs import TFailure, TResult, TSuccess

from .home_location_names import LOCATION_PATTERN, normalize_location_name
from .types import IImportedProductInfo

logger = logging.getLogger("main_logger")

UPC_RE = re.compile(r"\b\d{12}\b")

# ITEM_ATTRIBUTES_RE = r"(.+?)[ \t]+(\d{12})(?:[ \t]+\d)?[ \t]+([a-z]\d+)"
ITEM_ATTRIBUTES_RE = re.compile(
    r"(?P<name>.+?)[ \t]+(?P<upc>\d{12})(?:[ \t]+\w)?[ \t]+"
    rf"(?P<location>{LOCATION_PATTERN})\b[ \t]*",
    flags=re.MULTILINE | re.IGNORECASE,
)
# matches "<location> Section <n> <upc> <name>", where <name> runs until the next
# location/section/upc triplet or the end of the line, e.g.:
# "A1 Section 1 843740198695 Cat BoX H1 Section 1 843740135607 Spectacular"
LOCATION_FIRST_ITEM_ATTRIBUTES_RE = re.compile(
    rf"\b(?P<location>{LOCATION_PATTERN})[ \t]+Section[ \t]+\d+[ \t]+(?P<upc>\d{{12}})[ \t]+"
    rf"(?P<name>.*?)(?=[ \t]+{LOCATION_PATTERN}[ \t]+Section[ \t]+\d+[ \t]+\d{{12}}|[ \t]*$)",
    flags=re.IGNORECASE,
)


def parse_data(planogram_text_dump: str) -> TResult[list[IImportedProductInfo], list[str]]:
    product_list: list[IImportedProductInfo] = []
    lines_not_matched: list[str] = []
    invalid_upcs: list[str] = []
    errors: list[str] = []

    for line in planogram_text_dump.strip().splitlines():
        matches = match_whole_line(line)
        if not matches:
            lines_not_matched.append(line)
            continue

        for match in matches:
            upc = match.group("upc").strip()

            if not gs1.validate(upc):
                invalid_upcs.append(upc)
                continue

            product_list.append(
                {
                    "upc": upc,
                    "name": match.group("name").strip(),
                    "location": normalize_location_name(match.group("location")),
                }
            )

    for line in lines_not_matched:
        logger.info("Regex was not matched on line: '%s'", line)
        errors.append(f"No data was parsed from line: {line}")

    for upc in invalid_upcs:
        logger.info("Invalid UPC check digit: '%s'", upc)
        errors.append(f"Invalid UPC (failed check digit): {upc}")

    if errors:
        return TFailure(errors)

    return TSuccess(natsorted(product_list, key=lambda p: p["location"], reverse=True))


def match_whole_line(line: str) -> list[re.Match[str]]:
    """
    Returns the line's item matches, or nothing if any part of the line isn't a well-formed item.
    A malformed item must not be skipped over or absorbed into the name of its neighbor.
    """
    for item_re in (LOCATION_FIRST_ITEM_ATTRIBUTES_RE, ITEM_ATTRIBUTES_RE):
        matches = list(item_re.finditer(line))
        if matches and is_whole_line_matched(matches, line):
            return matches

    return []


def is_whole_line_matched(matches: list[re.Match[str]], line: str) -> bool:
    match_starts = [match.start() for match in matches] + [len(line)]
    match_ends = [0] + [match.end() for match in matches]
    has_gaps = any(
        line[end:start].strip() for end, start in zip(match_ends, match_starts, strict=True)
    )

    return not has_gaps and not any(UPC_RE.search(match.group("name")) for match in matches)
