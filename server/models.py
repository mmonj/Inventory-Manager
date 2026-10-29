import datetime
from dataclasses import dataclass
from typing import Any, Literal, Self

from django.conf import settings
from django.db import models
from django.utils import timezone

UNIX_EPOCH = datetime.datetime(1970, 1, 1, tzinfo=datetime.UTC)
QT_LIVE_WINDOW_DURATION = datetime.timedelta(minutes=10)

GLOBAL_SETTINGS_PK = 1


class GlobalSettings(models.Model):
    """
    Site-wide settings, kept in a single row (primary key GLOBAL_SETTINGS_PK).

    qt_live_until: development talks to the real Qt only while now is before it (the
    live window). Whether the window is open is worked out on read and never written back.
    """

    id = models.PositiveSmallIntegerField(
        primary_key=True, default=GLOBAL_SETTINGS_PK, editable=False
    )
    qt_live_until = models.DateTimeField(default=UNIX_EPOCH)

    class Meta:
        verbose_name = "Global settings"
        verbose_name_plural = "Global settings"

    def __str__(self) -> str:
        return "Global settings"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.pk = GLOBAL_SETTINGS_PK
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> Self:
        global_settings, _ = cls.objects.get_or_create(pk=GLOBAL_SETTINGS_PK)
        return global_settings

    def is_qt_live_window_open(self) -> bool:
        return timezone.now() < self.qt_live_until

    def open_qt_live_window(self) -> None:
        self.qt_live_until = timezone.now() + QT_LIVE_WINDOW_DURATION
        self.save(update_fields=["qt_live_until"])

    def close_qt_live_window(self) -> None:
        self.qt_live_until = UNIX_EPOCH
        self.save(update_fields=["qt_live_until"])


@dataclass(frozen=True)
class DevelopmentQtMode:
    """Which Qt development's real field reps talk to right now."""

    mode: Literal["fake", "live"]
    # When the live window closes; None while fake
    live_until: datetime.datetime | None


def get_development_qt_mode() -> DevelopmentQtMode | None:
    """
    The one rule for whether development talks to the real Qt: only while a live window
    is open. None in production, which always talks to the real Qt.
    """
    if not settings.DEBUG:
        return None

    global_settings = GlobalSettings.load()
    if not global_settings.is_qt_live_window_open():
        return DevelopmentQtMode(mode="fake", live_until=None)
    return DevelopmentQtMode(mode="live", live_until=global_settings.qt_live_until)
