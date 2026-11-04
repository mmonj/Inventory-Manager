from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from . import models


class ImportTest(TestCase):
    def setUp(self) -> None:
        file = Path(__file__).parent / "testfiles" / "planogram_text_dump.txt"

        with file.open(encoding="utf8") as fd:
            self.data_dump = fd.read()

        user = get_user_model().objects.create_superuser(
            username="testuser",
            password="testpass123",  # noqa: S106 -- test-only credential
        )
        self.client.force_login(user)

    def test_import(self) -> None:
        store = models.Store.objects.create(name="T3277")
        planogram = models.Planogram.objects.create(name="plano1 - 3277", store=store)

        route = reverse("product_locator:edit_planogram", args=[planogram.id])
        response = self.client.post(
            route,
            {
                "name": planogram.name,
                "plano_type": planogram.plano_type,
                "date_end": None,
                "planogram_text_dump": self.data_dump,
                "is_reset_planogram": False,
                "label": "",
            },
            content_type="application/json",
        )
        self.assertEqual(200, response.status_code)

    def test_invalid_import(self) -> None:
        store = models.Store.objects.create(name="T3277v2")
        planogram = models.Planogram.objects.create(name="plano1 - 3277v2", store=store)

        route = reverse("product_locator:edit_planogram", args=[planogram.id])
        response = self.client.post(
            route,
            {
                "name": planogram.name,
                "plano_type": planogram.plano_type,
                "date_end": None,
                "planogram_text_dump": "some random data",
                "is_reset_planogram": False,
                "label": "",
            },
            content_type="application/json",
        )
        self.assertEqual(400, response.status_code)


@pytest.mark.django_db
def test_body_with_wrong_shape_gets_400_naming_the_bad_fields(client: Client) -> None:
    superuser = get_user_model().objects.create_superuser(
        username="testuser",
        password="testpass123",  # noqa: S106 -- test-only credential
    )
    client.force_login(superuser)
    store = models.Store.objects.create(name="T3277v3")
    planogram = models.Planogram.objects.create(name="plano1 - 3277v3", store=store)

    response = client.post(
        reverse("product_locator:edit_planogram", args=[planogram.id]),
        {
            "name": planogram.name,
            "plano_type": planogram.plano_type,
            "date_end": None,
            "is_reset_planogram": {"not": "a bool"},
            "label": "",
        },
        content_type="application/json",
    )

    assert response.status_code == 400
    error_messages = response.json()
    assert isinstance(error_messages, list)
    assert all(isinstance(message, str) for message in error_messages)
    assert any("planogram_text_dump" in message for message in error_messages)
