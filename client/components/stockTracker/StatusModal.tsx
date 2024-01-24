import React from "react";

import { Modal } from "react-bootstrap";

import { THubModalController, THubModalState } from "@client/util/surveyWorker/types";

import { LoadingSpinner } from "../LoadingSpinner";

interface Props extends THubModalController {
  modalStatus: THubModalState;
}

export function StatusModal({ modalStatus, setStatus }: Props) {
  let headerStatus = "Loading...";
  if (modalStatus.errorMessages.length > 0) {
    headerStatus = "Error!";
  }

  function handleClose() {
    setStatus((prev) => ({ ...prev, isShow: !prev.isShow, errorMessages: [] }));
  }

  return (
    <Modal show={modalStatus.isShow} onHide={handleClose}>
      <Modal.Header className="h5" closeButton={modalStatus.errorMessages.length > 0}>
        {headerStatus}
        {modalStatus.errorMessages.length === 0 && (
          <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
        )}
      </Modal.Header>
      <Modal.Body>
        {modalStatus.statusMessages.map((message, idx) => (
          <p key={idx}>{message}</p>
        ))}
      </Modal.Body>
    </Modal>
  );
}
