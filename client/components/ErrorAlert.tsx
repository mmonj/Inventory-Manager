import React from "react";

import Alert from "react-bootstrap/Alert";

import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  errorMessages: string[];
  className?: string;
}

export function ErrorAlert({ errorMessages, className }: Props) {
  return (
    <Alert variant="danger" className={className}>
      <div className="d-flex align-items-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 fs-5" />
        <div>
          {errorMessages.map((message, index) => (
            <div key={index}>{message}</div>
          ))}
        </div>
      </div>
    </Alert>
  );
}
