from pathlib import Path

from django.test import TestCase
from django.urls import reverse

from . import models


class ImportTest(TestCase):
    def setUp(self) -> None:
        file = Path(__file__).parent / "testfiles" / "ocr_data_dump.txt"

        with file.open(encoding="utf8") as fd:
            self.data_dump = fd.read()

    def test_import(self) -> None:
        store = models.Store.objects.create(name="T3277")
        planogram = models.Planogram.objects.create(name="plano1 - 3277", store=store)

        route = reverse("product_locator:add_new_products")
        response = self.client.post(
            route, {"planogram_id": planogram.id, "planogram_text_dump": self.data_dump}
        )
        self.assertEqual(302, response.status_code)  # noqa: PT009

    def test_invalid_import(self) -> None:
        store = models.Store.objects.create(name="T3277v2")
        planogram = models.Planogram.objects.create(name="plano1 - 3277v2", store=store)

        route = reverse("product_locator:add_new_products")
        response = self.client.post(
            route, {"planogram_id": planogram.id, "planogram_text_dump": "some random data"}
        )
        self.assertEqual(500, response.status_code)  # noqa: PT009
