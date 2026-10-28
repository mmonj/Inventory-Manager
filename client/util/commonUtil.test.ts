import { describe, expect, it } from "vitest";

import { extractCoordinates } from "@client/util/commonUtil";

describe("extractCoordinates", () => {
  it("splits a 'longitude, latitude' string into numbers", () => {
    expect(extractCoordinates("-73.98, 40.75")).toEqual([-73.98, 40.75]);
  });
});
