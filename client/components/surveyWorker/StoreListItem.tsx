import React from "react";

import {
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesOnehubModelsMvmPlan,
} from "@reactivated";

import { getStoreWorktimeMinutes } from "@client/util/surveyWorker";

import { IStoreModalData } from "./StoreDetailsModal";

interface Props {
  store: SurveyWorkerInterfacesIWebhubStore;
  currentTickets: SurveyWorkerInterfacesOnehubModelsMvmPlan[];
  filteredTicketIds: Set<string>;
  isHideZeroTickets: boolean;
  setStoreModalData: React.Dispatch<React.SetStateAction<IStoreModalData | null>>;
}

export function StoreListItem({ store, ...props }: Props) {
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

  function handleShowStoreDetails() {
    props.setStoreModalData({
      store: store,
      storeTickets: thisStoreTickets,
      totalProjectTimeMins: totalProjectTimeMins,
    });
  }

  return (
    <li>
      <div className="list-group-item d-flex justify-content-between align-items-start">
        <div className="mx-2 me-3 w-100" onClick={handleShowStoreDetails}>
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
          {numPendingTickets !== 0 && (
            <small className="d-block">
              {Math.floor(totalProjectTimeMins / 60)} hr {totalProjectTimeMins % 60.0} min
            </small>
          )}
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
    </li>
  );
}
