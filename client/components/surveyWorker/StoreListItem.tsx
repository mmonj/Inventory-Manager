import React from "react";

import {
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesSqlContentMvmPlan,
} from "@reactivated";

interface Props {
  isHideZeroTickets: boolean;
  store: SurveyWorkerInterfacesIWebhubStore;
  currentTickets: SurveyWorkerInterfacesSqlContentMvmPlan[];
}

export function StoreListItem({ isHideZeroTickets, store, currentTickets }: Props) {
  const [isTicketsShown, setIsTicketsShown] = React.useState(false);

  const numPendingTickets = store.current_pending_mplan_ids.length;
  let numTicketsClassname = "";
  if (numPendingTickets == 0) {
    numTicketsClassname = "text-warning";
  }

  if (isHideZeroTickets && numPendingTickets == 0) {
    return;
  }

  return (
    <li>
      <div className="list-group-item d-flex justify-content-between align-items-start">
        <div className="ms-2 me-auto" onClick={() => setIsTicketsShown((prev) => !prev)}>
          <div className="fw-bold">{store.Name}</div>
          <p className="content-for-list-item my-1">
            <span className="d-block">{store.Address}</span>
            <small className="text-body">
              {store.City}, {store.State} {store.Zip}
            </small>
          </p>
        </div>
        <div>
          <small className={"d-block " + numTicketsClassname}>{numPendingTickets} tickets</small>
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
          <h5 className="text-dark">Tickets:</h5>
          {currentTickets.map((ticket) => {
            if (!store.current_pending_mplan_ids.includes(ticket.ID)) {
              return;
            }

            return (
              <p key={ticket.ID} className="mb-2">
                {ticket.Name}
              </p>
            );
          })}
        </div>
      )}
    </li>
  );
}
