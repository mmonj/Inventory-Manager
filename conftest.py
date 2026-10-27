from typing import Any

import pytest
import requests
from curl_cffi.requests import AsyncSession, Session


def _fail_blocked_request(method: str, url: str) -> None:
    # pytest.fail raises a BaseException, so best-effort callers that catch Exception
    # (e.g. push delivery) can't silently swallow a blocked request
    pytest.fail(
        f"Blocked real HTTP request during tests: {method} {url}. "
        "Tests must not reach real external services; fake the transport instead."
    )


@pytest.fixture(autouse=True)
def block_real_http(monkeypatch: pytest.MonkeyPatch) -> None:
    """
    Make every outbound HTTP request through curl_cffi or requests fail the test.

    Conftests lower down may patch the same transports again (after this fixture runs)
    to route requests to a fake, or to a narrow allowlist of real endpoints.
    """

    def blocked_curl_request(
        _session: Any, method: str, url: str, *_args: Any, **_kwargs: Any
    ) -> None:
        _fail_blocked_request(method, url)

    async def blocked_async_curl_request(
        _session: Any, method: str, url: str, *_args: Any, **_kwargs: Any
    ) -> None:
        _fail_blocked_request(method, url)

    def blocked_requests_send(
        _adapter: Any, request: requests.PreparedRequest, *_args: Any, **_kwargs: Any
    ) -> None:
        _fail_blocked_request(str(request.method), str(request.url))

    monkeypatch.setattr(Session, "request", blocked_curl_request)
    monkeypatch.setattr(AsyncSession, "request", blocked_async_curl_request)
    monkeypatch.setattr(requests.adapters.HTTPAdapter, "send", blocked_requests_send)
