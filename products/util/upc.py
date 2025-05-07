from typing import Optional

from checkdigit import gs1

from ..models import BrandParentCompany
from ..types import UPC_A_LENGTH


def get_check_digit(upc_without_check: str) -> str:
    if len(upc_without_check) != 11:
        raise ValueError(
            f"The test UPC must be length 11, but received length {len(upc_without_check)}, ({upc_without_check!r})"
        )

    input_val = upc_without_check[:11] + "?"
    result = gs1.missing(input_val)

    if result == "Invalid":
        raise ValueError(f"Invalid input to gs1.missing(): {input_val=}")
    return result

    # digits = list(map(int, upc_without_check))
    # odd_sum = sum(digits[-1::-2])
    # even_sum = sum(digits[-2::-2])
    # total = (odd_sum * 3) + even_sum

    # return str((10 - (total % 10)) % 10)


def get_upc_from_length11(trunc_upc: str, upc_prefixes: list[str]) -> Optional[str]:
    for prefix in upc_prefixes:
        candidate_upc = prefix + trunc_upc
        if gs1.validate(candidate_upc):
            return candidate_upc

    candidate_upc = trunc_upc + get_check_digit(trunc_upc)
    return candidate_upc if gs1.validate(candidate_upc) else None


def get_upc_from_length10(trunc_upc: str, upc_prefixes: list[str]) -> Optional[str]:
    for prefix in upc_prefixes:
        length11_upc = prefix + trunc_upc
        candidate_upc = length11_upc + get_check_digit(length11_upc)
        if gs1.validate(candidate_upc):
            return candidate_upc
    return None


def get_normalized_upc(raw_upc: str, company: BrandParentCompany) -> Optional[str]:  # noqa: PLR0911
    raw_upc = raw_upc.strip()

    # 1. Check for known corrections
    corrected_upc = (
        company.upc_corrections.filter(bad_upc=raw_upc).values_list("actual_upc", flat=True).first()
    )
    if corrected_upc is not None:
        return corrected_upc

    if len(raw_upc) == UPC_A_LENGTH and gs1.validate(raw_upc):
        return raw_upc

    upc_prefixes = company.default_upc_prefixes
    if len(upc_prefixes) == 0:
        return None

    if len(raw_upc) == 11:  # noqa: PLR2004
        return get_upc_from_length11(raw_upc, upc_prefixes)

    if len(raw_upc) == 10:  # noqa: PLR2004
        return get_upc_from_length10(raw_upc, upc_prefixes)

    return None
