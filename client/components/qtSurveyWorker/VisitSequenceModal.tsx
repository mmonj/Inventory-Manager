import React, { useState } from "react";

import { Alert, Button, Form, Modal } from "react-bootstrap";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { TTerritoryRep } from "@client/util/qtSurveyWorker/territoryView";

interface Props {
  title: string;
  submitLabel: string;
  /** Field reps the user can choose from. */
  reps: TTerritoryRep[];
  initialName: string;
  initialRepIds: number[];
  /** Which fields to show (both by default). A hidden field keeps its initial value. */
  shownFields?: "nameAndReps" | "name" | "reps";
  onHide: () => void;
  /** Saves the visit sequence, resolving to the server's error messages, or [] on success. */
  onSubmit: (name: string, repIds: number[]) => Promise<string[]>;
}

/**
 * Asks for a visit sequence's name and field reps. Mount it fresh each time it opens, so it starts
 * from the initial values.
 */
export function VisitSequenceModal(props: Props) {
  const shownFields = props.shownFields ?? "nameAndReps";
  const [name, setName] = useState(props.initialName);
  const [checkedRepIds, setCheckedRepIds] = useState<Set<number>>(new Set(props.initialRepIds));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  function toggleRep(repId: number) {
    setCheckedRepIds((current) => {
      const next = new Set(current);
      if (next.has(repId)) {
        next.delete(repId);
      } else {
        next.add(repId);
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    // Keeps the reps in the order they're listed
    const repIds = props.reps.map((rep) => rep.id).filter((repId) => checkedRepIds.has(repId));
    const submitErrorMessages = await props.onSubmit(name, repIds);
    setIsSaving(false);
    setErrorMessages(submitErrorMessages);
  }

  return (
    <Modal show onHide={props.onHide} backdrop="static" centered>
      <Form onSubmit={(event) => void handleSubmit(event)}>
        <Modal.Header closeButton>
          <Modal.Title>{props.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {shownFields !== "reps" && (
            <Form.Group className="mb-3" controlId="visit-sequence-name">
              <Form.Label className="fw-semibold">Name</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Form.Group>
          )}

          {shownFields !== "name" && (
            <>
              <div className="fw-semibold mb-2">Field Reps</div>
              {props.reps.map((rep) => (
                <Form.Check
                  key={rep.id}
                  type="checkbox"
                  id={`visit-sequence-rep-${rep.id}`}
                  label={rep.username}
                  checked={checkedRepIds.has(rep.id)}
                  onChange={() => toggleRep(rep.id)}
                  className="mb-2"
                />
              ))}
            </>
          )}

          {errorMessages.length > 0 && (
            <Alert variant="danger" className="mt-3 mb-0">
              {errorMessages.map((message, idx) => (
                <div key={idx}>{message}</div>
              ))}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={props.onHide}>
            Cancel
          </Button>
          <ButtonWithSpinner
            type="submit"
            className="btn btn-primary"
            spinnerVariant="light"
            fetchState={{ isLoading: isSaving, isError: false, errorMessages: [] }}
          >
            {props.submitLabel}
          </ButtonWithSpinner>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
