import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";

import { faCheck, faForward, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { TVisitSequenceOutcome } from "@client/util/qtSurveyWorker/territoryView";

/** Why a store was skipped, as the server records it. */
export type TSkipReason = Exclude<TVisitSequenceOutcome["skip_reason"], "">;

const SKIP_REASON_LABELS: Record<TSkipReason, string> = {
  temporarily_closed: "Temporarily closed",
  permanently_closed: "Permanently closed",
  staff_unavailable: "Staff/manager unavailable",
  other: "Other",
};

/** The visit sequence outcomes a store's popup or card shows, and the actions that change them. */
export interface TVisitSequenceStoreControls {
  outcomesBySiteId: ReadonlyMap<number, TVisitSequenceOutcome>;
  /** Resolves once the server has answered, whether or not it succeeded. */
  onMarkVisited: (siteId: number) => Promise<void>;
  /** Resolves to whether the server recorded the skip. */
  onSkip: (siteId: number, reason: TSkipReason, note: string) => Promise<boolean>;
  onUndo: (siteId: number) => Promise<void>;
}

function formatMarkedAt(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** The reason picker (plus a note field for Other) shown after pressing Skip. */
function SkipReasonPicker({
  siteId,
  onSkip,
  onCancel,
}: {
  siteId: number;
  onSkip: TVisitSequenceStoreControls["onSkip"];
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<TSkipReason>("temporarily_closed");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isNoteMissing = reason === "other" && note.trim() === "";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isNoteMissing) {
      return;
    }
    setIsSaving(true);
    const isSkipped = await onSkip(siteId, reason, reason === "other" ? note : "");
    setIsSaving(false);
    if (isSkipped) {
      onCancel();
    }
  }

  return (
    <Form className="d-flex flex-column gap-2 w-100" onSubmit={(event) => void handleSubmit(event)}>
      <Form.Select
        size="sm"
        aria-label="Reason for skipping"
        value={reason}
        onChange={(event) => setReason(event.target.value as TSkipReason)}
      >
        {Object.entries(SKIP_REASON_LABELS).map(([reasonValue, reasonLabel]) => (
          <option key={reasonValue} value={reasonValue}>
            {reasonLabel}
          </option>
        ))}
      </Form.Select>
      {reason === "other" && (
        <Form.Control
          size="sm"
          type="text"
          maxLength={200}
          placeholder="Short note (required)"
          aria-label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          autoFocus
        />
      )}
      <div className="d-flex gap-2">
        <ButtonWithSpinner
          type="submit"
          className="btn btn-sm btn-warning"
          fetchState={{ isLoading: isSaving, isError: false, errorMessages: [] }}
          disabled={isNoteMissing}
        >
          Skip Store
        </ButtonWithSpinner>
        <Button size="sm" variant="outline-secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </Form>
  );
}

/**
 * "Marked visited/skipped by …" plus Mark Visited, Skip or Undo, for one store in a visit
 * sequence. A skipped store can still be marked visited; a visited one has to be undone first.
 */
export function VisitSequenceOutcomeControls({
  siteId,
  controls,
  className = "",
  textClassName = "text-secondary",
}: {
  siteId: number;
  controls: TVisitSequenceStoreControls;
  className?: string;
  /** For the "Marked … by" lines, e.g. light text in a map popup. */
  textClassName?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingSkipReason, setIsPickingSkipReason] = useState(false);
  const outcome = controls.outcomesBySiteId.get(siteId);

  async function handleClick(action: (siteId: number) => Promise<void>) {
    setIsSaving(true);
    await action(siteId);
    setIsSaving(false);
  }

  const fetchState = { isLoading: isSaving, isError: false, errorMessages: [] };

  if (isPickingSkipReason && outcome === undefined) {
    return (
      <div className={className}>
        <SkipReasonPicker
          siteId={siteId}
          onSkip={controls.onSkip}
          onCancel={() => setIsPickingSkipReason(false)}
        />
      </div>
    );
  }

  const markVisitedButton = (
    <ButtonWithSpinner
      type="button"
      className="btn btn-sm btn-success"
      spinnerVariant="light"
      fetchState={fetchState}
      onClick={() => void handleClick(controls.onMarkVisited)}
    >
      <FontAwesomeIcon icon={faCheck} className="me-1" />
      Mark Visited
    </ButtonWithSpinner>
  );
  const undoButton = (
    <ButtonWithSpinner
      type="button"
      className="btn btn-sm btn-outline-secondary"
      fetchState={fetchState}
      onClick={() => void handleClick(controls.onUndo)}
    >
      <FontAwesomeIcon icon={faRotateLeft} className="me-1" />
      Undo
    </ButtonWithSpinner>
  );
  const markedByUsername = outcome?.marked_by_username ?? "a deleted user";

  return (
    <div className={`d-flex align-items-center flex-wrap gap-2 ${className}`}>
      {outcome === undefined && (
        <>
          {markVisitedButton}
          <Button
            size="sm"
            variant="warning"
            disabled={isSaving}
            onClick={() => setIsPickingSkipReason(true)}
          >
            <FontAwesomeIcon icon={faForward} className="me-1" />
            Skip
          </Button>
        </>
      )}
      {outcome?.kind === "visited" && (
        <>
          <span className={`small ${textClassName}`}>
            Marked visited by {markedByUsername} · {formatMarkedAt(outcome.marked_at)}
          </span>
          {undoButton}
        </>
      )}
      {outcome?.kind === "skipped" && (
        <>
          <span className={`small ${textClassName} w-100`}>
            Marked skipped by {markedByUsername} · {formatMarkedAt(outcome.marked_at)}
            <br />
            {outcome.skip_reason === "" ? "" : SKIP_REASON_LABELS[outcome.skip_reason]}
            {outcome.skip_note !== "" && `: ${outcome.skip_note}`}
          </span>
          {markVisitedButton}
          {undoButton}
        </>
      )}
    </div>
  );
}
