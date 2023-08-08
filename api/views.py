import hashlib
import logging
from typing import List, Optional

from django_stubs_ext import QuerySetAny

from .util import update_product_additions, update_product_record_names, validate_structure
from .types import (
    IGetStoreProductAdditions,
    IUpdateStoreFieldRep,
    IUpdateStoreInfo,
    IUpdateStorePersonnel,
)
from products.models import (
    PersonnelContact,
    Store,
    FieldRepresentative,
    BrandParentCompany,
    BarcodeSheet,
    StoreGUID,
)
from products.util import get_current_work_cycle
from products.tasks import get_external_product_images
from .serializers import (
    BarcodeSheetSerializer,
    PersonnelContactSerializer,
    StoreSerializer,
    FieldRepresentativeSerializer,
)

from rest_framework.request import Request as DrfRequest
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError as DrfValidationError, NotFound as DrfNotFound
from rest_framework.response import Response as DrfResponse
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger("main_logger")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def validate_api_token(request: DrfRequest) -> DrfResponse:
    """This route is used to check the validity of the client's API token without having to send any specific data.
    The presence of the @permission_classes decorator will assert the validity of the client's API token

    Returns:
        dict: Unimportant JSON response. The purpose of this route is to return
        a status code of 200 or 403 in the response
    """
    return DrfResponse({"detail": "Validated"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_field_reps(request: DrfRequest) -> DrfResponse:
    field_reps = FieldRepresentative.objects.all()
    resp_json = FieldRepresentativeSerializer(field_reps, many=True).data

    return DrfResponse(resp_json)


@api_view(["POST"])
def update_store_info(request: DrfRequest) -> DrfResponse:
    request_data: IUpdateStoreInfo = validate_structure(request.data, IUpdateStoreInfo)

    received_store_name = request_data.store_name
    received_partial_store_address = request_data.partial_store_address
    # possible store GUID. The GUID indicated may or may not be unique per store,
    # but it will be stored for historical purposes
    received_store_guid = request_data.store_guid

    if "" in [received_store_name, received_partial_store_address, received_store_guid]:
        raise DrfValidationError

    received_store_guid = received_store_guid.upper().strip()
    logger.info(f"Received request data {request_data}")

    stores_queryset: QuerySetAny[Store, Store]

    if received_partial_store_address is None:
        logger.info("Getting store by exact store name")
        stores_queryset = Store.objects.filter(name=received_store_name).prefetch_related(
            "field_representative", "store_guids"
        )
    else:
        logger.info("Getting store by partial store address")
        stores_queryset = Store.objects.filter(
            name__icontains=received_partial_store_address
        ).prefetch_related("field_representative", "store_guids")

    stores_list: List[Store] = []

    if not stores_queryset:
        logger.info("No store match found. Creating new store record")
        new_store: Store = Store.objects.create(name=received_store_name)
        store_guid, is_new_guid = StoreGUID.objects.get_or_create(value=received_store_guid)
        new_store.store_guids.add(store_guid)
        stores_list = [new_store]
    elif stores_queryset.count() > 0:
        logger.info("At least one store record retrieved. Returning first record in queryset")
        first_store: Optional[Store] = stores_queryset.first()
        if first_store:
            store_guid, is_new_guid = StoreGUID.objects.get_or_create(value=received_store_guid)
            first_store.store_guids.add(store_guid)
            stores_list = [first_store]

    if stores_queryset.count() > 1:
        logger.info(
            f"A total of {stores_queryset.count()} stores matched partial store address"
            f": '{received_partial_store_address}'. Full store name from request data: '{received_store_name}'"
        )

    return DrfResponse(StoreSerializer(stores_list, many=True).data)


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
        f'Received client name "{request_data.client_name}" for store "{request_data.store_id}"'
    )

    if not request_data.products:
        logger.info("Received 0 products from request payload.")
        raise DrfValidationError("Form contains 0 products")

    parent_company = BrandParentCompany.objects.filter(short_name=request_data.client_name).first()
    if parent_company is None:
        raise DrfNotFound(f"Parent company '{request_data.client_name}' not found")

    sorted_upcs = update_product_record_names(request_data, parent_company)
    hash_object = hashlib.sha256()
    hash_object.update(str(sorted_upcs).encode())
    upcs_hash = hash_object.hexdigest()

    # initiate worker
    get_external_product_images.delay()

    store = Store.objects.get(pk=request_data.store_id)
    product_additions = update_product_additions(store, request_data)

    current_work_cycle = get_current_work_cycle()
    barcode_sheet, is_new_barcode_sheet = BarcodeSheet.objects.prefetch_related(
        "product_additions"
    ).get_or_create(
        store=store,
        parent_company=parent_company,
        upcs_hash=upcs_hash,
        work_cycle=current_work_cycle,
    )

    if is_new_barcode_sheet:
        barcode_sheet.product_additions.add(*product_additions)

    logger.info(
        f"Returning JSON response with {len(product_additions)} product additions to client."
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
    else:
        store = Store.objects.get(pk=request_data.store_id)
        new_personel_contact = PersonnelContact.objects.create(
            first_name=request_data.new_personnel_first_name,
            last_name=request_data.new_personnel_last_name,
            store=store,
        )

        return DrfResponse(PersonnelContactSerializer(new_personel_contact).data)
