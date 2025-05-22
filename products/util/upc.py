import logging
import re
from typing import Optional

from checkdigit import gs1

from ..models import BrandParentCompany, PrefixMapping
from ..types import UPC_A_LENGTH

logger = logging.getLogger("main_logger")


def get_check_digit(upc_without_check: str) -> str:
    if len(upc_without_check) != UPC_A_LENGTH - 1:
        raise ValueError(
            f"The test UPC must be length 11, but received length {len(upc_without_check)}, ({upc_without_check!r})"
        )

    input_val = upc_without_check[:11] + "?"
    result = gs1.missing(input_val)

    if result == "Invalid":
        raise ValueError(f"Invalid input to gs1.missing({input_val=})")
    return result


def get_upc_from_length11(trunc_upc: str, upc_prefixes: tuple[str, ...]) -> Optional[str]:
    candidate_upc: Optional[str]
    for prefix in upc_prefixes:
        candidate_upc = prefix + trunc_upc

        if gs1.validate(candidate_upc):
            return candidate_upc

    candidate_upc = trunc_upc + get_check_digit(trunc_upc)
    if not candidate_upc.startswith(upc_prefixes):
        candidate_upc = get_upc_from_length10(trunc_upc[0:-1], upc_prefixes)

    return candidate_upc


def get_upc_from_length10(trunc_upc: str, upc_prefixes: tuple[str, ...]) -> Optional[str]:
    for prefix in upc_prefixes:
        length11_upc = prefix + trunc_upc
        candidate_upc = length11_upc + get_check_digit(length11_upc)

        if gs1.validate(candidate_upc):
            return candidate_upc

    return None


def get_prefix_from_product_name(
    product_name: str, parent_company: BrandParentCompany
) -> Optional[str]:

    try:
        prefix_mapping = PrefixMapping.objects.filter(
            parent_company=parent_company, product_name_regex__isnull=False
        ).order_by("prefix")

        for mapping in prefix_mapping:
            if re.match(mapping.product_name_regex, product_name, re.IGNORECASE):
                return mapping.prefix
    except PrefixMapping.DoesNotExist:
        logger.exception("PrefixMapping not found for product name %r", product_name)
        return None
    except re.error:
        logger.exception("Regex error while matching product name %r", product_name)
        return None
    except Exception:
        logger.exception("Unexpected error while fetching prefix for product name %r", product_name)
        return None

    return None


def _validate_upc(
    candidate_upc: Optional[str], upc_prefixes: tuple[str, ...], main_prefix: Optional[str]
) -> Optional[str]:
    if candidate_upc is None or len(candidate_upc) == 0:
        return None

    if len(candidate_upc) != UPC_A_LENGTH and not gs1.validate(candidate_upc):
        return None

    if main_prefix is not None and not candidate_upc.startswith(main_prefix):
        return None

    if not candidate_upc.startswith(upc_prefixes):
        return None

    return candidate_upc


def get_valid_upc(raw_upc: str, product_name: str, company: BrandParentCompany) -> Optional[str]:
    raw_upc = raw_upc.strip()

    upc_from_preset_upc_corrections = (
        company.upc_corrections.filter(bad_upc=raw_upc).values_list("actual_upc", flat=True).first()
    )
    if upc_from_preset_upc_corrections is not None:
        return upc_from_preset_upc_corrections

    upc_prefixes = tuple(company.default_upc_prefixes)
    if len(upc_prefixes) == 0:
        return None

    main_prefix = get_prefix_from_product_name(product_name, company)
    if main_prefix is not None:
        upc_prefixes = (main_prefix, *upc_prefixes)

    candidate_upc: Optional[str] = None
    if len(raw_upc) == UPC_A_LENGTH and main_prefix is not None:
        if raw_upc.startswith(upc_prefixes):
            candidate_upc = raw_upc
        elif len(raw_upc) == UPC_A_LENGTH + 1 and raw_upc[0] == "0":
            candidate_upc = raw_upc[1:]
        elif len(raw_upc) == UPC_A_LENGTH + 2 and raw_upc[0:2] == "00":
            candidate_upc = raw_upc[2:]

        candidate_upc = _validate_upc(raw_upc, upc_prefixes, main_prefix)
        if candidate_upc is None and raw_upc[0] != main_prefix and raw_upc[1] == main_prefix:
            candidate_upc = get_upc_from_length10(raw_upc[2:], (main_prefix,))
            candidate_upc = _validate_upc(candidate_upc, upc_prefixes, main_prefix)
        elif candidate_upc is None and raw_upc[0] != main_prefix:
            candidate_upc = get_upc_from_length10(raw_upc, (main_prefix,))
            candidate_upc = _validate_upc(candidate_upc, upc_prefixes, main_prefix)

    if len(raw_upc) == 11:  # noqa: PLR2004
        candidate_upc = get_upc_from_length11(raw_upc, upc_prefixes)
        candidate_upc = _validate_upc(candidate_upc, upc_prefixes, main_prefix)
    elif len(raw_upc) == 10:  # noqa: PLR2004
        candidate_upc = get_upc_from_length10(raw_upc, upc_prefixes)
        candidate_upc = _validate_upc(candidate_upc, upc_prefixes, main_prefix)

    return candidate_upc
