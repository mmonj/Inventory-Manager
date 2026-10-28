import React from "react";

import { Button, Form, Modal } from "react-bootstrap";

interface Props {
  show: boolean;
  onHide: () => void;
  showStoresWithoutPendingTickets: boolean;
  onChange: (value: boolean) => void;
  parentCompanies: string[];
  selectedParentCompanies: Set<string>;
  onChangeParentCompanies: (parentCompanies: Set<string>) => void;
}

export function TerritoryFilterModal(props: Props) {
  const { parentCompanies, selectedParentCompanies, onChangeParentCompanies } = props;

  function toggleParentCompany(parentCompany: string) {
    const next = new Set(selectedParentCompanies);
    if (next.has(parentCompany)) {
      next.delete(parentCompany);
    } else {
      next.add(parentCompany);
    }
    onChangeParentCompanies(next);
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
          checked={props.showStoresWithoutPendingTickets}
          onChange={(event) => props.onChange(event.target.checked)}
        />

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
            checked={selectedParentCompanies.has(parentCompany)}
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
