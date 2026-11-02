export type TProductLookupStatus = "idle" | "loading" | "found" | "not-found" | "failed";

// A hint for the browser. The server owns the grammar, and it strips surrounding whitespace.
export const LOCATION_NAME_INPUT_PATTERN = "\\s*[a-zA-Z][0-9]{1,3}\\s*";

interface IProductLookupState {
  isLoading: boolean;
  isError: boolean;
  hasProduct: boolean;
  isNotFound: boolean;
}

export function getProductLookupStatus({
  isLoading,
  isError,
  hasProduct,
  isNotFound,
}: IProductLookupState): TProductLookupStatus {
  if (isLoading) return "loading";
  if (isNotFound) return "not-found";
  if (hasProduct) return "found";
  return isError ? "failed" : "idle";
}
