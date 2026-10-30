/**
 * What the Territory Viewer is showing: one field rep's territory, the combined territory, or a
 * visit sequence.
 */
// Stored when the combined territory was last selected. Older code stored the same value.
const COMBINED_TERRITORY_STORAGE_VALUE = "all";
// Followed by the visit sequence's id
const VISIT_SEQUENCE_STORAGE_PREFIX = "visitSequence:";

export type TTerritorySelection =
  | { kind: "fieldRep"; repId: number }
  | { kind: "combinedTerritory" }
  | { kind: "visitSequence"; visitSequenceId: number };

/**
 * Reads a selection saved by toStoredTerritorySelection. Returns null when the stored value is
 * missing or no longer refers to anything the page offers.
 */
export function restoreTerritorySelection(
  storedValue: string | null,
  offeredRepIds: number[],
  offeredVisitSequenceIds: number[]
): TTerritorySelection | null {
  if (storedValue === null) {
    return null;
  }
  if (storedValue === COMBINED_TERRITORY_STORAGE_VALUE && offeredRepIds.length > 0) {
    return { kind: "combinedTerritory" };
  }
  if (storedValue.startsWith(VISIT_SEQUENCE_STORAGE_PREFIX)) {
    const visitSequenceId = Number(storedValue.slice(VISIT_SEQUENCE_STORAGE_PREFIX.length));
    return offeredVisitSequenceIds.includes(visitSequenceId)
      ? { kind: "visitSequence", visitSequenceId }
      : null;
  }
  const repId = parseInt(storedValue);
  if (!isNaN(repId) && offeredRepIds.includes(repId)) {
    return { kind: "fieldRep", repId };
  }
  return null;
}

export function toStoredTerritorySelection(selection: TTerritorySelection): string {
  switch (selection.kind) {
    case "fieldRep":
      return selection.repId.toString();
    case "combinedTerritory":
      return COMBINED_TERRITORY_STORAGE_VALUE;
    case "visitSequence":
      return `${VISIT_SEQUENCE_STORAGE_PREFIX}${selection.visitSequenceId}`;
  }
}

/**
 * The field reps the New Visit Sequence modal starts with ticked: the rep being viewed, every
 * rep while viewing All Field Reps, and none while viewing another visit sequence.
 */
export function getPreselectedRepIds(
  selection: TTerritorySelection | null,
  offeredRepIds: number[]
): number[] {
  switch (selection?.kind) {
    case "fieldRep":
      return [selection.repId];
    case "combinedTerritory":
      return [...offeredRepIds];
    default:
      return [];
  }
}

/** e.g. "Visit Sequence – Oct 29, 2026" */
export function getDefaultVisitSequenceName(date: Date): string {
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Visit Sequence – ${formattedDate}`;
}
