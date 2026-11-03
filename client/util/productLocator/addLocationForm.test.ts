import { describe, expect, it } from "vitest";

import { LOCATION_NAME_INPUT_PATTERN, readAddLocationForm } from "./addLocationForm";

describe("LOCATION_NAME_INPUT_PATTERN", () => {
  // Browsers anchor the pattern attribute and compile it with the v flag
  const locationNameRegex = new RegExp(`^(?:${LOCATION_NAME_INPUT_PATTERN})$`, "v");

  it.each(["A1", "a15", "B123", " A15 ", "\tA15"])("accepts %j", (locationName) => {
    expect(locationNameRegex.test(locationName)).toBe(true);
  });

  it.each(["", "   ", "A", "15", "A1234", "AB1", "A 15"])("rejects %j", (locationName) => {
    expect(locationNameRegex.test(locationName)).toBe(false);
  });
});

function buildAddLocationFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    formData.append(fieldName, fieldValue);
  }
  return formData;
}

describe("readAddLocationForm", () => {
  const completeFields = {
    "product-name": "Birthday Card",
    "new-location-name": "A15",
    "planogram-id": "7",
  };

  it("reads a complete form", () => {
    expect(readAddLocationForm(buildAddLocationFormData(completeFields))).toEqual({
      ok: true,
      productName: "Birthday Card",
      locationName: "A15",
      planogramId: 7,
    });
  });

  it("accepts a blank product name, which the server ignores for a known product", () => {
    const formData = buildAddLocationFormData({ ...completeFields, "product-name": "" });

    expect(readAddLocationForm(formData)).toMatchObject({ ok: true, productName: "" });
  });

  it("refuses a form with no planogram to choose from", () => {
    const { "planogram-id": _planogramId, ...fieldsWithoutPlanogram } = completeFields;

    expect(readAddLocationForm(buildAddLocationFormData(fieldsWithoutPlanogram))).toEqual({
      ok: false,
      errorMessage: "Choose a planogram.",
    });
  });

  it.each(["", "abc", "0"])("refuses planogram id %j", (planogramId) => {
    const formData = buildAddLocationFormData({ ...completeFields, "planogram-id": planogramId });

    expect(readAddLocationForm(formData)).toEqual({
      ok: false,
      errorMessage: "Choose a planogram.",
    });
  });

  it.each(["", "   "])("refuses location name %j", (locationName) => {
    const formData = buildAddLocationFormData({
      ...completeFields,
      "new-location-name": locationName,
    });

    expect(readAddLocationForm(formData)).toEqual({
      ok: false,
      errorMessage: "Enter a location.",
    });
  });

  it("refuses a form missing the product name field", () => {
    const { "product-name": _productName, ...fieldsWithoutName } = completeFields;

    expect(readAddLocationForm(buildAddLocationFormData(fieldsWithoutName))).toEqual({
      ok: false,
      errorMessage: "Enter a product name.",
    });
  });
});
