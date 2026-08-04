import React from "react";

import { Button, Form, Modal } from "react-bootstrap";

interface Props {
  show: boolean;
  onHide: () => void;
  jobClients: string[];
  selectedJobClients: Set<string>;
  onChange: (jobClients: Set<string>) => void;
}

export function JobClientFilterModal(props: Props) {
  const { jobClients, selectedJobClients, onChange } = props;

  function toggleJobClient(jobClient: string) {
    const next = new Set(selectedJobClients);
    if (next.has(jobClient)) {
      next.delete(jobClient);
    } else {
      next.add(jobClient);
    }
    onChange(next);
  }

  return (
    <Modal show={props.show} onHide={props.onHide} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>Filter by Job Client</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {jobClients.length === 0 && <div className="text-muted">No job clients available.</div>}
        {jobClients.map((jobClient) => (
          <Form.Check
            key={jobClient}
            type="checkbox"
            id={`job-client-filter-${jobClient}`}
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
