/** What the Territory Viewer is showing: one field rep's territory, or the combined territory. */
// Stored when the combined territory was last selected. Older code stored the same value.
const COMBINED_TERRITORY_STORAGE_VALUE = "all";

export type TTerritorySelection =
  { kind: "fieldRep"; repId: number } | { kind: "combinedTerritory" };

/**
 * Reads a selection saved by toStoredTerritorySelection. Returns null when the stored value is
 * missing or no longer refers to anything the page offers.
 */
export function restoreTerritorySelection(
  storedValue: string | null,
  offeredRepIds: number[]
): TTerritorySelection | null {
  if (storedValue === null) {
    return null;
  }
  if (storedValue === COMBINED_TERRITORY_STORAGE_VALUE && offeredRepIds.length > 0) {
    return { kind: "combinedTerritory" };
  }
  const repId = parseInt(storedValue);
  if (!isNaN(repId) && offeredRepIds.includes(repId)) {
    return { kind: "fieldRep", repId };
  }
  return null;
}

export function toStoredTerritorySelection(selection: TTerritorySelection): string {
  return selection.kind === "fieldRep"
    ? selection.repId.toString()
    : COMBINED_TERRITORY_STORAGE_VALUE;
}
