import { describe, expect, it } from "vitest";

import {
  getDefaultVisitSequenceName,
  getPreselectedRepIds,
  restoreTerritorySelection,
  toStoredTerritorySelection,
} from "@client/util/qtSurveyWorker/territorySelection";

const OFFERED_REP_IDS = [3, 7];
const OFFERED_VISIT_SEQUENCE_IDS = [12];

describe("restoreTerritorySelection", () => {
  it("restores a field rep id saved by the old code", () => {
    expect(restoreTerritorySelection("7", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)).toEqual({
      kind: "fieldRep",
      repId: 7,
    });
  });

  it("restores the combined territory value saved by the old code", () => {
    expect(restoreTerritorySelection("all", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)).toEqual({
      kind: "combinedTerritory",
    });
  });

  it("restores nothing for a field rep the page no longer offers", () => {
    expect(restoreTerritorySelection("5", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)).toBeNull();
  });

  it("restores nothing for the combined territory when no field reps are offered", () => {
    expect(restoreTerritorySelection("all", [], OFFERED_VISIT_SEQUENCE_IDS)).toBeNull();
  });

  it("restores a visit sequence", () => {
    expect(
      restoreTerritorySelection("visitSequence:12", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)
    ).toEqual({ kind: "visitSequence", visitSequenceId: 12 });
  });

  it("restores nothing for a visit sequence the page no longer lists", () => {
    expect(
      restoreTerritorySelection("visitSequence:13", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)
    ).toBeNull();
    expect(
      restoreTerritorySelection("visitSequence:x", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)
    ).toBeNull();
  });

  it("restores nothing when nothing usable was saved", () => {
    expect(restoreTerritorySelection(null, OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)).toBeNull();
    expect(restoreTerritorySelection("", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)).toBeNull();
    expect(
      restoreTerritorySelection("garbage", OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)
    ).toBeNull();
  });
});

describe("toStoredTerritorySelection", () => {
  it("stores selections in the format older code wrote", () => {
    expect(toStoredTerritorySelection({ kind: "fieldRep", repId: 7 })).toBe("7");
    expect(toStoredTerritorySelection({ kind: "combinedTerritory" })).toBe("all");
  });

  it("stores a visit sequence so it can be restored", () => {
    const storedValue = toStoredTerritorySelection({ kind: "visitSequence", visitSequenceId: 12 });
    expect(
      restoreTerritorySelection(storedValue, OFFERED_REP_IDS, OFFERED_VISIT_SEQUENCE_IDS)
    ).toEqual({ kind: "visitSequence", visitSequenceId: 12 });
  });
});

describe("getPreselectedRepIds", () => {
  it("ticks the field rep being viewed", () => {
    expect(getPreselectedRepIds({ kind: "fieldRep", repId: 7 }, OFFERED_REP_IDS)).toEqual([7]);
  });

  it("ticks every field rep while viewing All Field Reps", () => {
    expect(getPreselectedRepIds({ kind: "combinedTerritory" }, OFFERED_REP_IDS)).toEqual([3, 7]);
  });

  it("ticks no field reps while viewing a visit sequence", () => {
    expect(
      getPreselectedRepIds({ kind: "visitSequence", visitSequenceId: 12 }, OFFERED_REP_IDS)
    ).toEqual([]);
  });

  it("ticks no field reps when nothing is selected", () => {
    expect(getPreselectedRepIds(null, OFFERED_REP_IDS)).toEqual([]);
  });
});

describe("getDefaultVisitSequenceName", () => {
  it("names the sequence after the given day", () => {
    expect(getDefaultVisitSequenceName(new Date(2026, 9, 29))).toBe(
      "Visit Sequence – Oct 29, 2026"
    );
    expect(getDefaultVisitSequenceName(new Date(2027, 0, 3))).toBe("Visit Sequence – Jan 3, 2027");
  });
});
