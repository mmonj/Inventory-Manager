from typing import Optional

from checkdigit import gs1

from ..models import BrandParentCompany


def get_check_digit(upc_without_check: str) -> str:
    digits = list(map(int, upc_without_check))
    odd_sum = sum(digits[-1::-2])
    even_sum = sum(digits[-2::-2])
    total = (odd_sum * 3) + even_sum

    return str((10 - (total % 10)) % 10)


def get_normalized_upc(raw_upc: str, company: BrandParentCompany) -> Optional[str]:  # noqa: PLR0911
    raw_upc = raw_upc.strip()

    # 1. Check for known corrections
    corrected_upc = (
        company.upc_corrections.filter(bad_upc=raw_upc).values_list("actual_upc", flat=True).first()
    )
    if corrected_upc:
        return corrected_upc

    if gs1.validate(raw_upc):
        return raw_upc

    prefixes = company.default_upc_prefixes or []
    if len(prefixes) == 0:
        return None

    if len(raw_upc) == 11:  # noqa: PLR2004
        for prefix in prefixes:
            candidate_upc = prefix + raw_upc
            if gs1.validate(candidate_upc):
                return candidate_upc
        return raw_upc + get_check_digit(raw_upc)

    if len(raw_upc) == 10:  # noqa: PLR2004
        for prefix in prefixes:
            candidate_upc = prefix + raw_upc
            full_upc = candidate_upc + get_check_digit(candidate_upc)
            if gs1.validate(full_upc):
                return full_upc

    return None
