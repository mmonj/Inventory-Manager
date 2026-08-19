import React from "react";

import { Button, Form, Modal } from "react-bootstrap";

interface Props {
  show: boolean;
  onHide: () => void;
  showStoresWithoutPendingTickets: boolean;
  onChange: (value: boolean) => void;
  jobClients: string[];
  selectedJobClients: Set<string>;
  onChangeJobClients: (jobClients: Set<string>) => void;
}

export function TerritoryFilterModal(props: Props) {
  const { jobClients, selectedJobClients, onChangeJobClients } = props;

  function toggleJobClient(jobClient: string) {
    const next = new Set(selectedJobClients);
    if (next.has(jobClient)) {
      next.delete(jobClient);
    } else {
      next.add(jobClient);
    }
    onChangeJobClients(next);
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
        {jobClients.length === 0 && <div className="text-muted">No job clients available.</div>}
        {jobClients.map((jobClient) => (
          <Form.Check
            key={jobClient}
            type="checkbox"
            id={`territory-job-client-filter-${jobClient}`}
            label={jobClient}
            checked={selectedJobClients.has(jobClient)}
            onChange={() => toggleJobClient(jobClient)}
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
