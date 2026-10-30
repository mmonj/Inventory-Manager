/**
 * What the Territory Viewer is showing: one field rep's territory, the combined territory, or a
 * visit plan.
 */
// Stored when the combined territory was last selected. Older code stored the same value.
const COMBINED_TERRITORY_STORAGE_VALUE = "all";
// Followed by the visit plan's id
const VISIT_PLAN_STORAGE_PREFIX = "visitPlan:";

export type TTerritorySelection =
  | { kind: "fieldRep"; repId: number }
  | { kind: "combinedTerritory" }
  | { kind: "visitPlan"; visitPlanId: number };

/**
 * Reads a selection saved by toStoredTerritorySelection. Returns null when the stored value is
 * missing or no longer refers to anything the page offers.
 */
export function restoreTerritorySelection(
  storedValue: string | null,
  offeredRepIds: number[],
  offeredVisitPlanIds: number[]
): TTerritorySelection | null {
  if (storedValue === null) {
    return null;
  }
  if (storedValue === COMBINED_TERRITORY_STORAGE_VALUE && offeredRepIds.length > 0) {
    return { kind: "combinedTerritory" };
  }
  if (storedValue.startsWith(VISIT_PLAN_STORAGE_PREFIX)) {
    const visitPlanId = Number(storedValue.slice(VISIT_PLAN_STORAGE_PREFIX.length));
    return offeredVisitPlanIds.includes(visitPlanId) ? { kind: "visitPlan", visitPlanId } : null;
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
    case "visitPlan":
      return `${VISIT_PLAN_STORAGE_PREFIX}${selection.visitPlanId}`;
  }
}

/**
 * The field reps the New Visit Plan modal starts with ticked: the rep being viewed, every
 * rep while viewing All Field Reps, and none while viewing another visit plan.
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

/** e.g. "Visit Plan – Oct 29, 2026" */
export function getDefaultVisitPlanName(date: Date): string {
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Visit Plan – ${formattedDate}`;
}
