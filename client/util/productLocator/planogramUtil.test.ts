import { describe, expect, it } from "vitest";

import { getPlanogramSections } from "./planogramUtil";

function storePlanogram(name: string, dateStart: string, isOutdated: boolean) {
  return {
    planogram: {
      pk: 1,
      name,
      date_start: dateStart,
      date_end: null,
      is_outdated: isOutdated,
      plano_type_info: { value: "regular" as const, label: "Regular Planogram" },
    },
    product_count: 0,
  };
}

function sectionNames(sections: ReturnType<typeof getPlanogramSections>) {
  return sections.map((section) => [
    section.title,
    section.storePlanograms.map(({ planogram }) => planogram.name),
  ]);
}

describe("getPlanogramSections", () => {
  it("puts current planograms first, each section newest first", () => {
    const sections = getPlanogramSections([
      storePlanogram("Old outdated", "2024-01-01", true),
      storePlanogram("Old current", "2025-01-01", false),
      storePlanogram("New outdated", "2024-06-01", true),
      storePlanogram("New current", "2026-01-01", false),
    ]);

    expect(sectionNames(sections)).toEqual([
      ["Current", ["New current", "Old current"]],
      ["Outdated", ["New outdated", "Old outdated"]],
    ]);
  });

  it("hides an empty section", () => {
    const sections = getPlanogramSections([storePlanogram("Inline", "2026-01-01", false)]);

    expect(sectionNames(sections)).toEqual([["Current", ["Inline"]]]);
  });
});
