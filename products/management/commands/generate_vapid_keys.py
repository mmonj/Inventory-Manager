import base64
from typing import Any

from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand
from py_vapid import Vapid02  # type: ignore [import-untyped]


def to_base64url(raw_bytes: bytes) -> str:
    return base64.urlsafe_b64encode(raw_bytes).decode().rstrip("=")


class Command(BaseCommand):
    help = """
    Generate a VAPID keypair for Web Push, printed as VAPID_PRIVATE_KEY/VAPID_PUBLIC_KEY env
    lines. py_vapid expects the base64url-encoded DER body only (no PEM armor, no newlines). A
    mis-formatted key only fails at the first webpush() call, not at settings load, so check it
    with a real Message.send_to_users(...) rather than `manage.py check`. New env vars only
    reach the app after the container is recreated (docker-compose up -d --force-recreate).
    """

    def handle(self, *_args: Any, **_options: Any) -> None:
        vapid = Vapid02()
        vapid.generate_keys()

        private_key_der = vapid.private_key.private_bytes(
            serialization.Encoding.DER,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        public_key_raw = vapid.public_key.public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )

        self.stdout.write(f"VAPID_PRIVATE_KEY={to_base64url(private_key_der)}")
        self.stdout.write(f"VAPID_PUBLIC_KEY={to_base64url(public_key_raw)}")
