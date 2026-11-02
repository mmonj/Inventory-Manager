import type { interfaces } from "@reactivated";

type TStorePlanogram = interfaces.IPlanogramsByStore["planograms"][number];
type TMatchingHomeLocation =
  interfaces.MatchingProducts["products"][number]["home_locations"][number];
export type TMatchingPlanogram = TMatchingHomeLocation["planogram"];

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

export function getPlanogramsFromHomeLocations(
  homeLocations: TMatchingHomeLocation[]
): TMatchingPlanogram[] {
  const planogramsByPk = new Map(
    homeLocations.map(({ planogram }) => [planogram.pk, planogram] as const)
  );

  return [...planogramsByPk.values()];
}
