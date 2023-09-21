import React from "react";

import { SurveyWorkerInterfacesSqlContentMvmPlan } from "@reactivated";
import { Modal } from "react-bootstrap";

interface Props {
  isShow: boolean;
  setIsShow: React.Dispatch<React.SetStateAction<boolean>>;
  isHideZeroTickets: boolean;
  setIsHideZeroTickets: React.Dispatch<React.SetStateAction<boolean>>;
  filteredTicketIds: Set<string>;
  setFilteredTicketIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  currentTickets: SurveyWorkerInterfacesSqlContentMvmPlan[];
  currentRepTicketIds: string[];
}

// interface IFilterSetting {
//   isSet: boolean;
//   callback: () => void;
// }

export function TerritoryFiltersModal({ isShow, setIsShow, ...props }: Props) {
  const toggleShow = () => setIsShow((prev) => !prev);

  function getTicketName(ticketId: string): string {
    for (const ticket of props.currentTickets) {
      if (ticket.ID === ticketId) {
        return ticket.Name;
      }
    }

    return "Error: Bad Name. Alert Mauri";
  }

  const currentRepTickets = props.currentRepTicketIds
    .map((ticketId) => {
      return {
        id: ticketId,
        name: getTicketName(ticketId),
      };
    })
    .sort((a, b) => (a.name > b.name ? 1 : -1));

  function updateFilteredTicketIds(
    event: React.ChangeEvent<HTMLInputElement>,
    repTicketId: string
  ) {
    if (event.target.checked) {
      props.setFilteredTicketIds((prevIds) => {
        const newIds = new Set(prevIds);
        newIds.add(repTicketId);
        return newIds;
      });
    } else {
      props.setFilteredTicketIds((prevIds) => {
        const newIds = new Set(prevIds);
        newIds.delete(repTicketId);
        return newIds;
      });
    }
  }

  return (
    <>
      <Modal show={isShow} onHide={toggleShow}>
        <Modal.Header closeButton>
          <Modal.Title>Extra Filters</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="form-check my-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="hide-stores-zero-tickets"
              checked={props.isHideZeroTickets}
              onChange={() => props.setIsHideZeroTickets((prev) => !prev)}
            />
            <label className="form-check-label" htmlFor="hide-stores-zero-tickets">
              Hide stores with 0 pending tickets
            </label>
          </div>

          <div className="my-2">
            <label className="form-label">Filter out tickets: </label>
            <div className="ps-3">
              {currentRepTickets.map((repTicket) => {
                return (
                  <div key={repTicket.id} className="form-check my-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`set-filter-ticket-${repTicket.id}`}
                      name={repTicket.name}
                      checked={props.filteredTicketIds.has(repTicket.id)}
                      onChange={(e) => updateFilteredTicketIds(e, repTicket.id)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`set-filter-ticket-${repTicket.id}`}
                    >
                      {repTicket.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
