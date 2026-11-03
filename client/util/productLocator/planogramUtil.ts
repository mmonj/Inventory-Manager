import type { interfaces } from "@reactivated";

type TStorePlanogram = interfaces.IPlanogramsByStore["planograms"][number];
type TMatchingHomeLocation =
  interfaces.MatchingProducts["products"][number]["home_locations"][number];
type TMatchingPlanogram = TMatchingHomeLocation["planogram"];

interface PlanogramSection {
  title: "Current" | "Outdated";
  storePlanograms: TStorePlanogram[];
}

export function getPlanogramSections(storePlanograms: TStorePlanogram[]): PlanogramSection[] {
  const newestFirst = [...storePlanograms].sort((a, b) =>
    b.planogram.date_start.localeCompare(a.planogram.date_start)
  );

  const sections: PlanogramSection[] = [
    {
      title: "Current",
      storePlanograms: newestFirst.filter(({ planogram }) => !planogram.is_outdated),
    },
    {
      title: "Outdated",
      storePlanograms: newestFirst.filter(({ planogram }) => planogram.is_outdated),
    },
  ];

  return sections.filter((section) => section.storePlanograms.length > 0);
}

export function splitHomeLocations<THomeLocation extends { planogram: { is_outdated: boolean } }>(
  homeLocations: THomeLocation[]
): { currentHomeLocations: THomeLocation[]; outdatedHomeLocations: THomeLocation[] } {
  return {
    currentHomeLocations: homeLocations.filter(({ planogram }) => !planogram.is_outdated),
    outdatedHomeLocations: homeLocations.filter(({ planogram }) => planogram.is_outdated),
  };
}

export function getPlanogramsFromHomeLocations(
  homeLocations: TMatchingHomeLocation[]
): TMatchingPlanogram[] {
  const planogramsByPk = new Map(
    homeLocations.map(({ planogram }) => [planogram.pk, planogram] as const)
  );

  return [...planogramsByPk.values()];
}

export type THorizontalSectionThresholdsResult =
  { ok: true; thresholds: string[] | undefined } | { ok: false; errorMessage: string };

/** Parses the create form's "G, J"-style input. Blank input means no thresholds. */
export function parseHorizontalSectionThresholds(
  rawInput: string
): THorizontalSectionThresholdsResult {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return { ok: true, thresholds: undefined };
  }

  const thresholds = trimmedInput
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((threshold) => threshold.toUpperCase());

  if (thresholds.some((threshold) => threshold.length !== 1)) {
    return {
      ok: false,
      errorMessage: "Each section threshold must be a single character (e.g. G, J).",
    };
  }

  return { ok: true, thresholds };
}
