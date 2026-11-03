import { interfaces, reverse } from "@reactivated";

import { ApiResponse } from "@client/types";

export function getProductLocation(
  upc: string,
  storeId: number
): Promise<ApiResponse<interfaces.IProductLocations>> {
  // reverse() doesn't encode its args, and a scanned code could hold URL special characters
  const lookupUrl = reverse("product_locator:get_product_location", {
    store_id: storeId,
    upc: encodeURIComponent(upc),
  });

  return fetch(lookupUrl, { method: "GET", headers: { Accept: "application/json" } });
}

export function postNewProductLocation(
  assignment: interfaces.IAddNewProductLocationRequest,
  { storeId, planogramId }: { storeId: number; planogramId: number },
  csrfToken: string
): Promise<ApiResponse<interfaces.IHomeLocationUpdate>> {
  const assignmentUrl = reverse("product_locator:add_new_product_location", {
    store_id: storeId,
    planogram_id: planogramId,
  });

  return fetch(assignmentUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "content-type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(assignment),
  });
}

export function getRelatedProducts(
  productName: string,
  storeId: number
): Promise<ApiResponse<interfaces.MatchingProducts>> {
  const headers = {
    Accept: "application/json",
  };

  // The name goes in the query string since reverse() doesn't encode, and a path segment can't
  // hold a "/" even when encoded
  const searchQuery = {
    product_name: productName,
  } satisfies interfaces.IGetProductLocationsByNameRequest;
  const searchParams = new URLSearchParams(searchQuery);
  const searchUrl = reverse("product_locator:get_product_locations_by_name", { store_id: storeId });

  return fetch(`${searchUrl}?${searchParams.toString()}`, { headers: headers });
}

export function postHomeLocationCarryover(
  upc: string,
  olderProductId: number,
  planogramIds: number[],
  storeId: number,
  csrfToken: string
): Promise<ApiResponse<interfaces.IProductLocatorProduct>> {
  const carryoverUrl = reverse("product_locator:carry_over_home_locations", {
    store_id: storeId,
    older_product_id: olderProductId,
  });

  return fetch(carryoverUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({
      upc,
      planogram_ids: planogramIds,
    } satisfies interfaces.ICarryOverHomeLocationsRequest),
  });
}
