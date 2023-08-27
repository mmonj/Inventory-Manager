import { interfaces, reverse } from "@reactivated";

import { ApiResponse } from "@client/types";

export function getProductLocation(
  upc: string,
  store_id: number,
  action_path: string
): Promise<ApiResponse<interfaces.IProductLocations>> {
  const params = new URLSearchParams();
  params.append("upc", upc);
  params.append("store_id", store_id.toString());

  const action_url = action_path + "?" + params.toString();

  return fetch(action_url, { method: "GET", headers: { Accept: "application/json" } });
}

export function postNewProductLocation(
  formData: FormData,
  formElm: HTMLFormElement,
  csrfTokenValue: string
): Promise<ApiResponse<interfaces.IHomeLocationUpdate>> {
  const payload = {
    upc: formData.get("upc-number"),
    product_name: formData.get("product-name"),
    planogram_id: formData.get("planogram-id"),
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

  return fetch(
    reverse("product_locator:get_product_locations_by_name", {
      store_id: storeId,
      product_name: productName,
    }),
    { headers: headers }
  );
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

  return fetch(reverse("product_locator:add_upc_to_scan_audit"), {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      scan_audit_id: scan_audit_id,
      upc: upc,
    }),
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
    body: JSON.stringify({
      product_type: product_type,
    }),
  });
}
