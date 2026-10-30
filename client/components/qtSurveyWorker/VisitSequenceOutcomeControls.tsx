import React, { useState } from "react";

import { faCheck, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { TVisitSequenceOutcome } from "@client/util/qtSurveyWorker/territoryView";

/** What a store's popup or card needs to show and change its outcome in a visit sequence. */
export interface TVisitSequenceStoreActions {
  outcomesBySiteId: ReadonlyMap<number, TVisitSequenceOutcome>;
  /** Resolves once the server has answered, whether or not it succeeded. */
  onMarkVisited: (siteId: number) => Promise<void>;
  onUndo: (siteId: number) => Promise<void>;
}

function formatMarkedAt(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Marked visited by …" plus Mark Visited or Undo, for one store in a visit sequence. */
export function VisitSequenceOutcomeControls({
  siteId,
  actions,
  className = "",
  textClassName = "text-secondary",
}: {
  siteId: number;
  actions: TVisitSequenceStoreActions;
  className?: string;
  /** For the "Marked visited by" line, e.g. light text in a map popup. */
  textClassName?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const outcome = actions.outcomesBySiteId.get(siteId);

  async function handleClick(action: (siteId: number) => Promise<void>) {
    setIsSaving(true);
    await action(siteId);
    setIsSaving(false);
  }

  const fetchState = { isLoading: isSaving, isError: false, errorMessages: [] };

  return (
    <div className={`d-flex align-items-center flex-wrap gap-2 ${className}`}>
      {outcome === undefined ? (
        <ButtonWithSpinner
          type="button"
          className="btn btn-sm btn-success"
          spinnerVariant="light"
          fetchState={fetchState}
          onClick={() => void handleClick(actions.onMarkVisited)}
        >
          <FontAwesomeIcon icon={faCheck} className="me-1" />
          Mark Visited
        </ButtonWithSpinner>
      ) : (
        <>
          <span className={`small ${textClassName}`}>
            Marked visited by {outcome.marked_by_username ?? "a deleted user"} ·{" "}
            {formatMarkedAt(outcome.marked_at)}
          </span>
          <ButtonWithSpinner
            type="button"
            className="btn btn-sm btn-outline-secondary"
            fetchState={fetchState}
            onClick={() => void handleClick(actions.onUndo)}
          >
            <FontAwesomeIcon icon={faRotateLeft} className="me-1" />
            Undo
          </ButtonWithSpinner>
        </>
      )}
    </div>
  );
}
