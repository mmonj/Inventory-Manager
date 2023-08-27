import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response as DrfResponse

from ..models import HomeLocation, ProductScanAudit
from .serializers import HomeLocation_Products_Serializer, ScanAuditSerializer

logger = logging.getLogger("main_logger")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_planogram_locations(request: DRFRequest) -> DrfResponse:
    planogram_name = request.GET.get("planogram-name")
    store_name = request.GET.get("store-name")
    home_locations = (
        HomeLocation.objects.prefetch_related("products")
        .filter(planogram__name=planogram_name, planogram__store__name=store_name)
        .all()
    )

    home_locations_json = HomeLocation_Products_Serializer(home_locations, many=True).data

    return DrfResponse(home_locations_json)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_products_from_latest_scan_audit(request: DRFRequest) -> DrfResponse:
    scan_audit = ProductScanAudit.objects.prefetch_related("products_in_stock").last()
    if scan_audit is None:
        raise DrfNotFound("No available scan audits")

    return DrfResponse(ScanAuditSerializer(scan_audit).data)
