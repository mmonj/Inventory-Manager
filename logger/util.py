import shortuuid

from . import serializers
from products import models


def record_product_addition(product_addition, is_product_scanned=False):
    if is_product_scanned and not product_addition.is_carried:
        product_addition.is_carried = True

    product_addition.update_date_scanned()
    product_addition.save(update_fields=['date_last_scanned', 'is_carried'])


def set_not_carried(product_addition):
    if product_addition.is_carried:
        product_addition.is_carried = False
        product_addition.save(update_fields=['is_carried'])


def get_territory_list():
    field_reps = models.FieldRepresentative.objects.prefetch_related("stores").all()
    territory_list = serializers.FieldRepresentativeSerializer(field_reps, many=True).data

    stores_data = serializers.StoreSerializer(models.Store.objects.all(), many=True).data
    territory_list.append({
        "id": shortuuid.uuid(),
        "name": "All Stores",
        "stores": stores_data
    })

    return territory_list
