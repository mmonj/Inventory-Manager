import React from "react";

import {
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesOnehubModelsMvmPlan,
} from "@reactivated";
import { Button, Modal } from "react-bootstrap";

import { trimTicketName } from "@client/util/surveyWorker";

export interface IStoreModalData {
  store: SurveyWorkerInterfacesIWebhubStore;
  storeTickets: SurveyWorkerInterfacesOnehubModelsMvmPlan[];
  totalProjectTimeMins: number;
}

interface Props {
  storeData: IStoreModalData | null;
  setStoreData: React.Dispatch<React.SetStateAction<IStoreModalData | null>>;
}

export function StoreDetailsModal({ storeData, setStoreData }: Props) {
  const ticketDescriptor = storeData?.storeTickets.length === 1 ? "Ticket" : "Ticket(s)";

  function handleClose() {
    setStoreData(null);
  }

  return (
    <Modal show={storeData !== null} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Store Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {storeData !== null && (
          <>
            <div className="mb-3">
              <div className="fw-bold">{storeData.store.Name}</div>
              <p className="content-for-list-item my-1">
                <span className="d-block">{storeData.store.Address}</span>
                <small className="text-body">
                  {storeData.store.City}, {storeData.store.State} {storeData.store.Zip}
                </small>
              </p>
            </div>

            <div className="fw-bold mb-2">
              {storeData.storeTickets.length} {ticketDescriptor} Pending
            </div>
            {storeData.totalProjectTimeMins > 0 && (
              <div className="fw-bold mb-1">
                {Math.floor(storeData.totalProjectTimeMins / 60)} hr{" "}
                {storeData.totalProjectTimeMins % 60.0} min
              </div>
            )}
            <ul className="">
              {storeData.storeTickets.map((ticket) => (
                <li key={ticket.ID} className="">
                  {trimTicketName(ticket.Name)}{" "}
                  <span className="fw-bold">({ticket.EstimatedTime} min)</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
