import React from "react";

import { Button, Form, Modal } from "react-bootstrap";

import { TTerritoryRep } from "@client/util/qtSurveyWorker/territoryView";

interface Props {
  show: boolean;
  onHide: () => void;
  showStoresWithoutPendingServiceOrders: boolean;
  onChange: (value: boolean) => void;
  parentCompanies: string[];
  excludedParentCompanies: ReadonlySet<string>;
  onChangeExcludedParentCompanies: (excludedParentCompanies: Set<string>) => void;
  /** The combined territory's reps, or null when showing a single rep (no rep filter). */
  reps: TTerritoryRep[] | null;
  excludedRepIds: ReadonlySet<number>;
  onChangeExcludedRepIds: (excludedRepIds: Set<number>) => void;
}

function toggled<T>(items: ReadonlySet<T>, item: T): Set<T> {
  const next = new Set(items);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}

export function TerritoryFilterModal(props: Props) {
  const {
    parentCompanies,
    excludedParentCompanies,
    onChangeExcludedParentCompanies,
    reps,
    excludedRepIds,
    onChangeExcludedRepIds,
  } = props;

  function toggleParentCompany(parentCompany: string) {
    onChangeExcludedParentCompanies(toggled(excludedParentCompanies, parentCompany));
  }

  function toggleRep(repId: number) {
    onChangeExcludedRepIds(toggled(excludedRepIds, repId));
  }

  return (
    <Modal show={props.show} onHide={props.onHide} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>Filters</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Check
          type="checkbox"
          id="show-stores-without-pending-tickets-checkbox"
          label="Show stores without pending tickets"
          checked={props.showStoresWithoutPendingServiceOrders}
          onChange={(event) => props.onChange(event.target.checked)}
        />

        {reps !== null && (
          <>
            <hr />

            <div className="fw-semibold mb-2">Field Representative</div>
            {reps.map((rep) => (
              <Form.Check
                key={rep.id}
                type="checkbox"
                id={`territory-rep-filter-${rep.id}`}
                label={rep.username}
                checked={!excludedRepIds.has(rep.id)}
                onChange={() => toggleRep(rep.id)}
                className="mb-2"
              />
            ))}
          </>
        )}

        <hr />

        <div className="fw-semibold mb-2">Job Client</div>
        {parentCompanies.length === 0 && (
          <div className="text-muted">No job clients available.</div>
        )}
        {parentCompanies.map((parentCompany) => (
          <Form.Check
            key={parentCompany}
            type="checkbox"
            id={`territory-parent-company-filter-${parentCompany}`}
            label={parentCompany}
            checked={!excludedParentCompanies.has(parentCompany)}
            onChange={() => toggleParentCompany(parentCompany)}
            className="mb-2"
          />
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={props.onHide}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
