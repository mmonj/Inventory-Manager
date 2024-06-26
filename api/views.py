import hashlib
import logging

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound as DrfNotFound
from rest_framework.exceptions import PermissionDenied as DrfPermissionDenied
from rest_framework.exceptions import ValidationError as DrfValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request as DrfRequest
from rest_framework.response import Response as DrfResponse

from products.models import (
    BarcodeSheet,
    BrandParentCompany,
    FieldRepresentative,
    PersonnelContact,
    Store,
)
from products.tasks import get_external_product_images
from products.util import get_current_work_cycle
from server.utils.common import validate_structure
from survey_worker.interfaces import ICmkHtmlSourcesData
from survey_worker.util import add_cmk_urls_to_db_workcycle, get_current_work_cycle_data

from .interfaces_request import ICmkStoreHtmlData
from .serializers import (
    BarcodeSheetSerializer,
    FieldRepresentativeSerializer,
    PersonnelContactSerializer,
    StoreSerializer,
)
from .types import (
    IGetStoreProductAdditions,
    IUpdateStoreFieldRep,
    IUpdateStoreInfo,
    IUpdateStorePersonnel,
)
from .util import update_product_additions, update_product_record_names

logger = logging.getLogger("main_logger")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def validate_api_token(_request: DrfRequest) -> DrfResponse:
    """
    Used to check the validity of the client's API token without having to send any specific data.
    The presence of the @permission_classes decorator will assert the validity of the client's API token

    Returns:
        dict: Unimportant JSON response. The purpose of this route is to return
        a status code of 200 or 403 in the response
    """
    return DrfResponse({"detail": "Validated"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_field_reps(_request: DrfRequest) -> DrfResponse:
    field_reps = FieldRepresentative.objects.all()
    resp_json = FieldRepresentativeSerializer(field_reps, many=True).data

    return DrfResponse(resp_json)


@api_view(["POST"])
def update_store_info(request: DrfRequest) -> DrfResponse:
    request_data: IUpdateStoreInfo = validate_structure(request.data, IUpdateStoreInfo)

    received_store_name = request_data.store_name
    received_partial_store_address = request_data.partial_store_address
    received_store_guid = request_data.store_guid.upper().strip()

    logger.info("Received request data %s", request_data)
    if "" in [received_store_name, received_partial_store_address, received_store_guid]:
        raise DrfValidationError("Empty field value received in payload")

    store = (
        Store.objects.filter(guid=received_store_guid)
        .prefetch_related("field_representative", "contacts")
        .first()
    )

    if store is None and received_partial_store_address is not None:
        logger.info(
            "No store match found. Searching for existing store with partial address: '%s'",
            received_partial_store_address,
        )
        store = (
            Store.objects.filter(name__icontains=received_partial_store_address, guid=None)
            .prefetch_related("field_representative", "contacts")
            .first()
        )
        if store is not None:
            store.guid = received_store_guid
            store.save(update_fields=["guid"])

    if store is None:
        logger.info(
            "No store match found. Creating new store record for store '%s', guid '%s'",
            request_data.store_name,
            request_data.store_guid,
        )
        try:
            store = Store.objects.create(name=received_store_name, guid=received_store_guid)
        except ValidationError as ex:
            raise DrfValidationError(ex.messages) from ex

    return DrfResponse(StoreSerializer(store).data)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_store_field_rep(request: DrfRequest) -> DrfResponse:
    request_data: IUpdateStoreFieldRep = validate_structure(request.data, IUpdateStoreFieldRep)

    store = Store.objects.get(id=request_data.store_id)
    new_field_rep = FieldRepresentative.objects.get(id=request_data.new_field_rep_id)
    store.field_representative = new_field_rep
    store.save(update_fields=["field_representative"])

    resp_data = StoreSerializer(store).data
    return DrfResponse(resp_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_store_product_additions(request: DrfRequest) -> DrfResponse:
    request_data: IGetStoreProductAdditions = validate_structure(
        request.data, IGetStoreProductAdditions
    )
    logger.info(
        'Received client name "%s" for store "%s"', request_data.client_name, request_data.store_id
    )

    if not request_data.products:
        logger.info("Received 0 products from request payload.")
        raise DrfValidationError("Form contains 0 products")

    parent_company = BrandParentCompany.objects.filter(short_name=request_data.client_name).first()
    if parent_company is None:
        raise DrfNotFound(f"Parent company '{request_data.client_name}' not found")

    upcs = update_product_record_names(request_data, parent_company)

    hash_object = hashlib.sha256()
    hash_object.update(str(sorted(upcs)).encode())
    sorted_upcs_hash = hash_object.hexdigest()

    # initiate worker
    get_external_product_images.delay()

    store = Store.objects.get(pk=request_data.store_id)
    product_additions = update_product_additions(store, request_data)

    current_work_cycle = get_current_work_cycle()
    barcode_sheet = (
        BarcodeSheet.objects.prefetch_related("product_additions")
        .filter(
            store=store,
            parent_company=parent_company,
            upcs_hash=sorted_upcs_hash,
            work_cycle=current_work_cycle,
        )
        .first()
    )

    if barcode_sheet is None:
        barcode_sheet = BarcodeSheet.objects.prefetch_related("product_additions").create(
            store=store,
            parent_company=parent_company,
            upcs_hash=sorted_upcs_hash,
            upcs_list=upcs,
            work_cycle=current_work_cycle,
        )
        barcode_sheet.product_additions.add(*product_additions)
    elif barcode_sheet.upcs_list is None:
        barcode_sheet.upcs_list = upcs
        barcode_sheet.save(update_fields=["upcs_list"])

    logger.info(
        "Returning JSON response with %d product additions to client.", len(product_additions)
    )
    return DrfResponse(
        BarcodeSheetSerializer(barcode_sheet, context={"work_cycle": current_work_cycle}).data
    )


@api_view(["POST"])
def update_store_personnel(request: DrfRequest) -> DrfResponse:
    request_data: IUpdateStorePersonnel = validate_structure(request.data, IUpdateStorePersonnel)

    if "" in [
        request_data.store_id,
        request_data.new_personnel_first_name,
        request_data.new_personnel_last_name,
    ]:
        return DrfResponse({"detail": "Empty field values provided"}, status=500)

    if request_data.existing_personnel_id:
        personnel_contact = PersonnelContact.objects.get(pk=request_data.existing_personnel_id)
        personnel_contact.first_name = request_data.new_personnel_first_name
        personnel_contact.last_name = request_data.new_personnel_last_name
        personnel_contact.save(update_fields=["first_name", "last_name"])

        return DrfResponse(PersonnelContactSerializer(personnel_contact).data)

    store = Store.objects.get(pk=request_data.store_id)
    new_personel_contact = PersonnelContact.objects.create(
        first_name=request_data.new_personnel_first_name,
        last_name=request_data.new_personnel_last_name,
        store=store,
    )

    return DrfResponse(PersonnelContactSerializer(new_personel_contact).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_cmk_html_src(request: DrfRequest) -> DrfResponse:
    if request.user.is_authenticated and not request.user.is_superuser:
        raise DrfPermissionDenied

    request_data = validate_structure(request.data, ICmkStoreHtmlData)

    current_work_cycle_data = get_current_work_cycle_data()
    cmklaunch_urls_html_sources: list[ICmkHtmlSourcesData] = (
        current_work_cycle_data.cmklaunch_urls_html_sources
    )

    add_cmk_urls_to_db_workcycle(current_work_cycle_data, cmklaunch_urls_html_sources)

    for cmk_data in cmklaunch_urls_html_sources:
        if cmk_data["cmk_url"] == request_data.cmk_url:
            cmk_data["html_src"] = request_data.html_src

    logger.info(request_data.cmk_url)
    logger.info(len(request_data.html_src))

    current_work_cycle_data.cmklaunch_urls_html_sources = cmklaunch_urls_html_sources
    current_work_cycle_data.save(update_fields=["cmklaunch_urls_html_sources"])

    return DrfResponse({"success": True}, status=200)
