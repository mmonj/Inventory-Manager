import { ApiResponse, LocationUpdateResponseType, ProductResponseType } from "@client/types";

export function getProductLocation(
  upc: string,
  store_id: number,
  action_path: string
): Promise<ApiResponse<ProductResponseType>> {
  const params = new URLSearchParams();
  params.append("upc", upc);
  params.append("store_id", store_id.toString());

  const action_url = action_path + "?" + params.toString();

  return fetch(action_url, { method: "get" });
}

export function postNewProductLocation(
  formData: FormData,
  formElm: HTMLFormElement,
  csrfTokenValue: string
): Promise<ApiResponse<LocationUpdateResponseType>> {
  const payload = {
    upc: formData.get("upc-number"),
    planogram_id: formData.get("planogram-id"),
    location: formData.get("new-location-name"),
  };

  return fetch(formElm.action, {
    method: formElm.method,
    headers: {
      "content-type": "application/json",
      "X-CSRFToken": csrfTokenValue,
    },
    body: JSON.stringify(payload),
  });
}
