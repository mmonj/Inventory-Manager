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
  formData: FormData,
  formElm: HTMLFormElement,
  storeId: number,
  csrfTokenValue: string
): Promise<ApiResponse<interfaces.IHomeLocationUpdate>> {
  const payload = {
    upc: formData.get("upc-number"),
    product_name: formData.get("product-name"),
    planogram_id: formData.get("planogram-id"),
    store_id: storeId,
    location: formData.get("new-location-name"),
  };

  return fetch(formElm.action, {
    method: formElm.method,
    headers: {
      Accept: "application/json",
      "content-type": "application/json",
      "X-CSRFToken": csrfTokenValue,
    },
    body: JSON.stringify(payload),
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
  return fetch(reverse("product_locator:carry_over_home_locations"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({
      upc,
      older_product_id: olderProductId,
      planogram_ids: planogramIds,
      store_id: storeId,
    }),
  });
}

export function postToScanAudit(
  scan_audit_id: number,
  upc: string,
  csrfToken: string
): Promise<ApiResponse<interfaces.IProductLocatorProduct>> {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken,
  };

  return fetch(reverse("product_locator:add_upc_to_scan_audit", { scan_audit_id }), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ upc } satisfies interfaces.IAddUpcToScanAuditRequest),
  });
}

export function createNewScanAudit(
  product_type: string,
  csrfToken: string
): Promise<ApiResponse<interfaces.IScanAuditCreation>> {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken,
  };

  return fetch(reverse("product_locator:create_new_scan_audit"), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ product_type } satisfies interfaces.ICreateNewScanAuditRequest),
  });
}
