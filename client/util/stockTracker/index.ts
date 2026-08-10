import { reverse } from "@reactivated";

import { ApiResponse } from "@client/types";

import { BasicBarcodeSheet, BasicBrandParentCompany, BasicProductAddition } from "./ajaxInterfaces";

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
    product_name?: string; // optional substring filter on the associated Product's name
    brand_parent_company_ids?: string; // optional comma-separated BrandParentCompany pks
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

export function getBarcodeSheets(
  csrfToken: string,
  payloadData: {
    page: number; // page number which to fetch
    field_representative_id?: number; // optional FieldRepresentative pk to filter by
  }
): Promise<ApiResponse<BasicBarcodeSheet[]>> {
  const endpointUrl = new URL(
    reverse("stock_tracker:get_barcode_sheets"),
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

export const UNKNOWN_BRAND_COMPANY_LABEL = "Unknown brand";

export function getBrandCompanyLabel(brandCompany: BasicBrandParentCompany): string {
  return brandCompany.expanded_name ?? brandCompany.short_name ?? UNKNOWN_BRAND_COMPANY_LABEL;
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
