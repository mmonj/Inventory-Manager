import { reverse } from "@reactivated";

import { ApiResponse } from "@client/types";

import { BasicProductAddition } from "./ajaxInterfaces";

export async function postLogProductScan(
  upc: string,
  storeId: number,
  csrfToken: string
): Promise<ApiResponse<BasicProductAddition>> {
  const headers = {
    "X-CSRFToken": csrfToken,
    "Content-Type": "application/json",
  };

  const payload_data = {
    upc: upc,
    store_id: storeId,
  };

  return fetch(reverse("stock_tracker:log_product_scan"), {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload_data),
  });
}

export function getProductAdditions(
  csrfToken: string,
  payloadData: {
    store_id: number;
    page: number; // page number which to fetch
    sort_by: string;
  }
): Promise<ApiResponse<BasicProductAddition[]>> {
  const endpointUrl = new URL(
    reverse("stock_tracker:get_product_additions_by_store"),
    document.location.origin
  );
  for (const [payloadKey, payloadValue] of Object.entries(payloadData)) {
    endpointUrl.searchParams.set(payloadKey, payloadValue.toString());
  }

  return fetch(endpointUrl, {
    method: "GET",
    headers: {
      "X-CSRFToken": csrfToken,
    },
  });
}

export function uncarry_product_addition(product_addition_id: number, csrfToken: string) {
  const headers = {
    "X-CSRFToken": csrfToken,
    "Content-Type": "application/json",
  };

  const payload_data = {
    product_addition_id: product_addition_id,
  };

  return fetch(reverse("stock_tracker:uncarry_product_addition_by_id"), {
    method: "PUT",
    headers: headers,
    body: JSON.stringify(payload_data),
  });
}
