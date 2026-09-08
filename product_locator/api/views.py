import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response as DrfResponse

from ..models import Planogram, ProductScanAudit
from .serializers import HomeLocationProductsSerializer, PlanogramSerializer, ScanAuditSerializer

logger = logging.getLogger("main_logger")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_planogram_locations(request: DRFRequest) -> DrfResponse:
    planogram_name = request.GET.get("planogram-name")
    store_name = request.GET.get("store-name")

    planogram = Planogram.objects.filter(name=planogram_name, store__name=store_name).first()
    if planogram is None:
        raise DrfNotFound(f"Planogram '{planogram_name}' for store '{store_name}' not found")

    home_locations = planogram.locations.prefetch_related("products").all()

    return DrfResponse(
        {
            "planogram": PlanogramSerializer(planogram).data,
            "home_locations": HomeLocationProductsSerializer(home_locations, many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_products_from_latest_scan_audit(_request: DRFRequest) -> DrfResponse:
    scan_audit = ProductScanAudit.objects.prefetch_related("products_in_stock").last()
    if scan_audit is None:
        raise DrfNotFound("No available scan audits")

    return DrfResponse(ScanAuditSerializer(scan_audit).data)
