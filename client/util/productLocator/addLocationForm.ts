// A hint for the browser. The server owns the grammar, and it strips surrounding whitespace.
export const LOCATION_NAME_INPUT_PATTERN = "\\s*[a-zA-Z][0-9]{1,3}\\s*";

export type TAddLocationFormResult =
  | { ok: true; productName: string; locationName: string; planogramId: number }
  | { ok: false; errorMessage: string };

function readTextField(formData: FormData, fieldName: string): string | null {
  const fieldValue = formData.get(fieldName);
  return typeof fieldValue === "string" ? fieldValue : null;
}

/**
 * Reads the Add Location form. The product name may be blank, since a known product's locked name
 * can be, and the server ignores it then.
 */
export function readAddLocationForm(formData: FormData): TAddLocationFormResult {
  const productName = readTextField(formData, "product-name");
  if (productName === null) {
    return { ok: false, errorMessage: "Enter a product name." };
  }

  const locationName = readTextField(formData, "new-location-name");
  if (locationName === null || locationName.trim() === "") {
    return { ok: false, errorMessage: "Enter a location." };
  }

  // A select with no options (no current planogram for the store) submits nothing
  const planogramId = Number(readTextField(formData, "planogram-id") ?? "");
  if (!Number.isInteger(planogramId) || planogramId <= 0) {
    return { ok: false, errorMessage: "Choose a planogram." };
  }

  return { ok: true, productName, locationName, planogramId };
}
