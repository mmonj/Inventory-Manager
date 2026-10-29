import React from "react";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TActiveFilterSummary } from "@client/util/qtSurveyWorker/territoryView";

interface Props {
  activeFilterSummary: TActiveFilterSummary;
  onEditFilters: () => void;
  className?: string;
}

/** The Territory Viewer's "Filters active" banner, shown on the page and in the map modal. */
export function TerritoryFiltersActiveBanner({
  activeFilterSummary,
  onEditFilters,
  className = "",
}: Props) {
  if (!activeFilterSummary.isAnyFilterActive) {
    return null;
  }

  return (
    <div className={`p-2 bg-warning-subtle text-warning-emphasis small ${className}`}>
      <FontAwesomeIcon icon={faTriangleExclamation} className="me-1" />
      Filters active
      {activeFilterSummary.areStoresWithoutPendingServiceOrdersHidden &&
        " — stores with no pending tickets are hidden"}
      {activeFilterSummary.isRepFilterActive &&
        ` — showing ${activeFilterSummary.shownRepCount} of ${activeFilterSummary.totalRepCount} reps`}
      {activeFilterSummary.isParentCompanyFilterActive &&
        ` — showing ${activeFilterSummary.shownParentCompanyCount} of ${activeFilterSummary.totalParentCompanyCount} job clients`}
      .{" "}
      <button
        type="button"
        className="btn btn-link btn-sm p-0 align-baseline"
        onClick={onEditFilters}
      >
        Edit filters
      </button>
    </div>
  );
}
