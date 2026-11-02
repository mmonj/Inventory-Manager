import { describe, expect, it } from "vitest";

import { LOCATION_NAME_INPUT_PATTERN, getProductLookupStatus } from "./addLocationForm";

const finishedLookup = { isLoading: false, isError: false, hasProduct: false, isNotFound: false };

describe("getProductLookupStatus", () => {
  it("is idle before any lookup", () => {
    expect(getProductLookupStatus(finishedLookup)).toBe("idle");
  });

  it("is loading while a lookup runs", () => {
    expect(getProductLookupStatus({ ...finishedLookup, isLoading: true })).toBe("loading");
  });

  it("is found when the lookup returned a Product", () => {
    expect(getProductLookupStatus({ ...finishedLookup, hasProduct: true })).toBe("found");
  });

  it("is not-found for a finished lookup with no Product", () => {
    expect(getProductLookupStatus({ ...finishedLookup, isError: true, isNotFound: true })).toBe(
      "not-found"
    );
  });

  it("is failed for a failure other than not found", () => {
    expect(getProductLookupStatus({ ...finishedLookup, isError: true })).toBe("failed");
  });

  it("trusts not-found over a late reply for an earlier scan", () => {
    expect(getProductLookupStatus({ ...finishedLookup, hasProduct: true, isNotFound: true })).toBe(
      "not-found"
    );
  });
});

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
