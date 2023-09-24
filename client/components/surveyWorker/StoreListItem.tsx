import React from "react";

import {
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesSqlContentMvmPlan,
} from "@reactivated";

import { getStoreWorktimeMinutes, trimTicketName } from "@client/util/surveyWorker";

interface Props {
  store: SurveyWorkerInterfacesIWebhubStore;
  currentTickets: SurveyWorkerInterfacesSqlContentMvmPlan[];
  filteredTicketIds: Set<string>;
  isHideZeroTickets: boolean;
}

export function StoreListItem({ store, ...props }: Props) {
  const [isTicketsShown, setIsTicketsShown] = React.useState(false);

  const [totalProjectTimeMins, thisStoreTickets] = getStoreWorktimeMinutes(
    store.current_pending_mplan_ids,
    props.filteredTicketIds,
    props.currentTickets
  );

  const numPendingTickets: number = store.current_pending_mplan_ids.filter(
    (ticketId) => !props.filteredTicketIds.has(ticketId)
  ).length;

  if (props.isHideZeroTickets && numPendingTickets === 0) {
    return;
  }

  let numTicketsClassname = "";
  if (numPendingTickets == 0) {
    numTicketsClassname = "text-warning";
  }

  return (
    <li>
      <div className="list-group-item d-flex justify-content-between align-items-start">
        <div className="mx-2 me-3 w-100" onClick={() => setIsTicketsShown((prev) => !prev)}>
          <div className="fw-bold">{store.Name}</div>
          <p className="content-for-list-item my-1">
            <span className="d-block">{store.Address}</span>
            <small className="text-body">
              {store.City}, {store.State} {store.Zip}
            </small>
          </p>
        </div>
        <div>
          <small className={"d-block " + numTicketsClassname}>
            {numPendingTickets} {numPendingTickets === 1 ? "ticket" : "tickets"}
          </small>
          <a
            href={
              "https://www.google.com/maps/place/" +
              encodeURIComponent(`${store.Address} ${store.City}, ${store.State} ${store.Zip}`)
            }
            target="_blank"
            rel="noreferrer"
            className="badge rounded-pill text-bg-primary"
          >
            View Map
          </a>
        </div>
      </div>
      {isTicketsShown && (
        <div className="ms-3 alert alert-info">
          <h5 className="text-dark">{numPendingTickets} Ticket(s) Pending</h5>
          {totalProjectTimeMins > 0 && (
            <div className="fw-bold mb-1">
              {Math.floor(totalProjectTimeMins / 60)} hr {totalProjectTimeMins % 60.0} min
            </div>
          )}
          <ul className="">
            {thisStoreTickets.map((ticket) => (
              <li key={ticket.ID} className="">
                {trimTicketName(ticket.Name)}{" "}
                <span className="fw-bold">({ticket.EstimatedTime} min)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
