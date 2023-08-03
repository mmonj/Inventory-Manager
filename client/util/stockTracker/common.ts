import { reverse } from "@reactivated";

import { ApiResponse, IProductAdditionResponse } from "@client/types";

import { BasicProductAddition } from "./apiInterfaces";

interface IPostProductAdditionOptions {
  isRemove?: boolean;
}

export async function postProductAddition(
  upc: string,
  storeId: number,
  storeName: string,
  actionUrl: string,
  csrfToken: string,
  { isRemove = false }: IPostProductAdditionOptions = {}
): Promise<ApiResponse<IProductAdditionResponse>> {
  const headers = {
    "X-CSRFToken": csrfToken,
  };

  const payload_data = {
    upc: upc,
    store_id: storeId,
    store_name: storeName,
    is_remove: isRemove,
  };

  return fetch(actionUrl, {
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
