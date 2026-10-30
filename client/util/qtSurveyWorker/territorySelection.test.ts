import { describe, expect, it } from "vitest";

import {
  restoreTerritorySelection,
  toStoredTerritorySelection,
} from "@client/util/qtSurveyWorker/territorySelection";

const OFFERED_REP_IDS = [3, 7];

describe("restoreTerritorySelection", () => {
  it("restores a field rep id saved by the old code", () => {
    expect(restoreTerritorySelection("7", OFFERED_REP_IDS)).toEqual({
      kind: "fieldRep",
      repId: 7,
    });
  });

  it("restores the combined territory value saved by the old code", () => {
    expect(restoreTerritorySelection("all", OFFERED_REP_IDS)).toEqual({
      kind: "combinedTerritory",
    });
  });

  it("restores nothing for a field rep the page no longer offers", () => {
    expect(restoreTerritorySelection("5", OFFERED_REP_IDS)).toBeNull();
  });

  it("restores nothing for the combined territory when no field reps are offered", () => {
    expect(restoreTerritorySelection("all", [])).toBeNull();
  });

  it("restores nothing when nothing usable was saved", () => {
    expect(restoreTerritorySelection(null, OFFERED_REP_IDS)).toBeNull();
    expect(restoreTerritorySelection("", OFFERED_REP_IDS)).toBeNull();
    expect(restoreTerritorySelection("garbage", OFFERED_REP_IDS)).toBeNull();
  });
});

describe("toStoredTerritorySelection", () => {
  it("stores selections in the format older code wrote", () => {
    expect(toStoredTerritorySelection({ kind: "fieldRep", repId: 7 })).toBe("7");
    expect(toStoredTerritorySelection({ kind: "combinedTerritory" })).toBe("all");
  });
});
