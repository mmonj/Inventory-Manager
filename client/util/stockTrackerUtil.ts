import { ApiResponse, IProductAdditionResponse } from "@client/types";

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
