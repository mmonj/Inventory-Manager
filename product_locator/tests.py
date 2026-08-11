from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from . import models


class ImportTest(TestCase):
    def setUp(self) -> None:
        file = Path(__file__).parent / "testfiles" / "ocr_data_dump.txt"

        with file.open(encoding="utf8") as fd:
            self.data_dump = fd.read()

        user = get_user_model().objects.create_user(username="testuser", password="testpass123")  # noqa: S106 -- test-only credential
        self.client.force_login(user)

    def test_import(self) -> None:
        store = models.Store.objects.create(name="T3277")
        planogram = models.Planogram.objects.create(name="plano1 - 3277", store=store)

        route = reverse("product_locator:submit_planogram_products")
        response = self.client.post(
            route,
            {
                "planogram_id": planogram.id,
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

        route = reverse("product_locator:submit_planogram_products")
        response = self.client.post(
            route,
            {
                "planogram_id": planogram.id,
                "planogram_text_dump": "some random data",
                "is_reset_planogram": False,
                "label": "",
            },
            content_type="application/json",
        )
        self.assertEqual(400, response.status_code)
