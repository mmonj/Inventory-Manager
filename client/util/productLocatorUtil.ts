export function fetchGetProductLocation(
  upc: string,
  store_id: number,
  action_path: string
): Promise<Response> {
  const params = new URLSearchParams();
  params.append("upc", upc);
  params.append("store_id", store_id.toString());

  const action_url = action_path + "?" + params.toString();

  return fetch(action_url, { method: "get" });
}
