import asyncio
import contextlib
import re

import pytest
import requests
from curl_cffi.requests import AsyncSession, Session


def test_curl_cffi_request_is_blocked() -> None:
    with pytest.raises(pytest.fail.Exception, match=re.escape("GET https://example.com/")):
        Session().get("https://example.com/")


def test_curl_cffi_async_request_is_blocked() -> None:
    async def make_request() -> None:
        async with AsyncSession() as session:
            await session.post("https://example.com/")

    with pytest.raises(pytest.fail.Exception, match=re.escape("POST https://example.com/")):
        asyncio.run(make_request())


def test_requests_request_is_blocked() -> None:
    with pytest.raises(pytest.fail.Exception, match=re.escape("GET https://example.com/")):
        requests.get("https://example.com/", timeout=5)


def test_guard_is_not_swallowed_by_broad_except() -> None:
    def fetch_ignoring_errors() -> None:
        # mirrors best-effort callers like products/push.py
        with contextlib.suppress(Exception):
            requests.get("https://example.com/", timeout=5)

    with pytest.raises(pytest.fail.Exception):
        fetch_ignoring_errors()
