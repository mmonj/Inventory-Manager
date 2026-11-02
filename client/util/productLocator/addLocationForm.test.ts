import { describe, expect, it } from "vitest";

import { LOCATION_NAME_INPUT_PATTERN } from "./addLocationForm";

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
