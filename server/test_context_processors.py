import datetime
import zoneinfo

import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, override_settings
from django.utils import timezone

from server.context_processors import context_provider
from server.models import GlobalSettings

NOW = datetime.datetime(2026, 10, 28, 16, 0, tzinfo=datetime.UTC)


@pytest.fixture
def frozen_now(monkeypatch: pytest.MonkeyPatch) -> datetime.datetime:
    monkeypatch.setattr(timezone, "now", lambda: NOW)
    return NOW


def _qt_mode_in_context() -> object:
    request = RequestFactory().get("/")
    request.user = AnonymousUser()
    return context_provider(request)["qt_mode"]


@override_settings(DEBUG=True)
def test_development_reports_fake_while_the_live_window_is_closed(
    db: None, frozen_now: datetime.datetime
) -> None:
    assert _qt_mode_in_context() == {"mode": "fake", "live_until_time": None}


@override_settings(DEBUG=True, TIME_ZONE="America/New_York")
def test_development_reports_live_with_the_window_end_in_local_time(
    db: None, frozen_now: datetime.datetime
) -> None:
    GlobalSettings.load().open_qt_live_window()

    with timezone.override(zoneinfo.ZoneInfo("America/New_York")):
        # 16:10 UTC is 12:10 in New York (EDT)
        assert _qt_mode_in_context() == {"mode": "live", "live_until_time": "12:10"}


@override_settings(DEBUG=False)
def test_production_reports_no_qt_mode_even_with_the_live_window_open(
    db: None, frozen_now: datetime.datetime
) -> None:
    GlobalSettings.load().open_qt_live_window()

    assert _qt_mode_in_context() is None
