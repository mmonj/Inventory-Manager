from typing import List, NamedTuple
from reactivated import Pick, template

from .models import Planogram, Store


@template
class ProductLocatorIndex(NamedTuple):
    stores: List[Pick[Store, "pk", "name"]]
    planograms: List[Pick[Planogram, "name"]]
