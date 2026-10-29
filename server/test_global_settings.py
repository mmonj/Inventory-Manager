import datetime

import pytest
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from server.models import GlobalSettings

NOW = datetime.datetime(2026, 10, 28, 12, 0, tzinfo=datetime.UTC)


@pytest.fixture
def frozen_now(monkeypatch: pytest.MonkeyPatch) -> datetime.datetime:
    monkeypatch.setattr(timezone, "now", lambda: NOW)
    return NOW


def test_live_window_is_closed_by_default(db: None, frozen_now: datetime.datetime) -> None:
    global_settings = GlobalSettings.load()

    assert global_settings.qt_live_until == datetime.datetime(1970, 1, 1, tzinfo=datetime.UTC)
    assert not global_settings.is_qt_live_window_open()


@pytest.mark.parametrize(
    ("qt_live_until", "is_open"),
    [
        (NOW + datetime.timedelta(seconds=1), True),
        (NOW, False),
        (NOW - datetime.timedelta(seconds=1), False),
    ],
)
def test_live_window_is_open_only_while_now_is_before_qt_live_until(
    db: None, frozen_now: datetime.datetime, qt_live_until: datetime.datetime, is_open: bool
) -> None:
    GlobalSettings.objects.update_or_create(pk=1, defaults={"qt_live_until": qt_live_until})

    assert GlobalSettings.load().is_qt_live_window_open() is is_open


def test_a_second_row_can_not_be_saved(db: None) -> None:
    GlobalSettings.load()

    with pytest.raises(IntegrityError), transaction.atomic():
        GlobalSettings(id=2).save()

    assert GlobalSettings.objects.count() == 1


@pytest.fixture
def admin_client_logged_in(db: None) -> Client:
    admin_user = User.objects.create_superuser("admin", "admin@example.com", "admin_password")
    client = Client()
    client.force_login(admin_user)
    return client


def _run_admin_action(client: Client, action_name: str) -> None:
    GlobalSettings.load()
    response = client.post(
        reverse("admin:server_globalsettings_changelist"),
        {"action": action_name, "_selected_action": ["1"]},
    )
    assert response.status_code == 302


def test_admin_action_opens_the_live_window_for_10_minutes(
    admin_client_logged_in: Client, frozen_now: datetime.datetime
) -> None:
    _run_admin_action(admin_client_logged_in, "open_qt_live_window")

    assert GlobalSettings.load().qt_live_until == NOW + datetime.timedelta(minutes=10)


def test_admin_action_closes_the_live_window(
    admin_client_logged_in: Client, frozen_now: datetime.datetime
) -> None:
    _run_admin_action(admin_client_logged_in, "open_qt_live_window")
    _run_admin_action(admin_client_logged_in, "close_qt_live_window")

    assert not GlobalSettings.load().is_qt_live_window_open()
