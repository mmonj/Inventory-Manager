import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { StoreListItem } from "@client/components/surveyWorker/StoreListItem";
import { TerritoryFiltersModal } from "@client/components/surveyWorker/TerritoryFiltersModal";
import { getTimeAgo } from "@client/util/surveyWorker";

interface IFilterSettings {
  isSet: boolean;
}

export default function (props: templates.SurveyWorkerTerritoryViewer) {
  const [selectedRepIdx, setSelectedRepIdx] = React.useState<number>(0);
  const [isHideZeroTickets, setIsHideZeroTickets] = React.useState(false);
  const [isFiltersModalShow, setIsFiltersModalShow] = React.useState(false);
  const [filteredTicketIds, setFilteredTicketIds] = React.useState<Set<string>>(new Set());

  const filterSettings: Record<string, IFilterSettings> = {
    hideZeroTickets: {
      isSet: isHideZeroTickets === true,
    },
    filterTicketIds: {
      isSet:
        filteredTicketIds.size > 0 &&
        props.reps_to_store[selectedRepIdx].current_pending_mplan_ids.some((repTicketId) =>
          filteredTicketIds.has(repTicketId)
        ),
    },
  };
  const numFiltersSet = Object.values(filterSettings).filter(
    (setting) => setting.isSet === true
  ).length;

  let numStoresShown = props.reps_to_store[selectedRepIdx].webhub_stores.length;
  if (isHideZeroTickets) {
    numStoresShown = props.reps_to_store[selectedRepIdx].webhub_stores.filter(
      (store) => store.current_pending_mplan_ids.length !== 0
    ).length;

    if (filteredTicketIds.size !== 0) {
      console.log("here");
      numStoresShown -= props.reps_to_store[selectedRepIdx].webhub_stores.filter(
        (store) =>
          store.current_pending_mplan_ids.every((storeTicketId) =>
            filteredTicketIds.has(storeTicketId)
          ) && store.current_pending_mplan_ids.length !== 0
      ).length;
    }
  }

  return (
    <Layout title="Territory Viewer" navbar={<NavigationBar />}>
      <section className="mw-rem-60 mx-auto p-2 px-3">
        <h1 className="title-color text-center">Territory Viewer</h1>
        <div className="my-2">
          <label htmlFor="rep-select" className="form-label">
            Select a Field Rep
          </label>
          <select
            name="rep-select"
            id="rep-select"
            className="form-select"
            value={selectedRepIdx}
            onChange={(e) => setSelectedRepIdx(() => parseInt(e.target.value))}
          >
            {props.reps_to_store.map((repStoreData, idx) => (
              <option key={repStoreData.rep_id} value={idx}>
                {repStoreData.rep_name}
              </option>
            ))}
          </select>
        </div>

        <h4 className="mt-3">{props.reps_to_store[selectedRepIdx].rep_name}&apos;s territory</h4>
        <h6 className="">{numStoresShown} stores shown</h6>
        <h6 className="mb-3">
          Last Syncced: {getTimeAgo(props.reps_to_store[selectedRepIdx].last_syncced)}
        </h6>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsFiltersModalShow((prev) => !prev)}
        >
          Show more filters
        </button>
        {numFiltersSet > 0 && (
          <span className="text-warning mx-3">{numFiltersSet} filter(s) set</span>
        )}

        <div className="form-check my-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="hide-stores-zero-tickets"
            checked={isHideZeroTickets}
            onChange={() => setIsHideZeroTickets((prev) => !prev)}
          />
          <label className="form-check-label" htmlFor="hide-stores-zero-tickets">
            Hide stores with 0 pending tickets
          </label>
        </div>

        <div className="list-group list-group-numbered">
          {props.reps_to_store[selectedRepIdx].webhub_stores.map((store) => {
            return (
              <StoreListItem
                key={store.ID}
                store={store}
                currentTickets={props.current_mplans}
                filteredTicketIds={filteredTicketIds}
                isHideZeroTickets={isHideZeroTickets}
              />
            );
          })}
        </div>

        <TerritoryFiltersModal
          isShow={isFiltersModalShow}
          setIsShow={setIsFiltersModalShow}
          isHideZeroTickets={isHideZeroTickets}
          setIsHideZeroTickets={setIsHideZeroTickets}
          filteredTicketIds={filteredTicketIds}
          setFilteredTicketIds={setFilteredTicketIds}
          currentTickets={props.current_mplans}
          currentRepTicketIds={props.reps_to_store[selectedRepIdx].current_pending_mplan_ids}
        />
      </section>
    </Layout>
  );
}
