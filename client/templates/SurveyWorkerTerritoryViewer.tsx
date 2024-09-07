import React from "react";

import { Context, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { StoreListItem } from "@client/components/surveyWorker/StoreListItem";
import { TerritoryFiltersModal } from "@client/components/surveyWorker/TerritoryFiltersModal";
import {
  getStoreWorktimeMinutes,
  getTimeAgo,
  isHasWebhubStoreNoTickets,
} from "@client/util/surveyWorker";

interface IFilterSettings {
  isSet: boolean;
}

export default function (props: templates.SurveyWorkerTerritoryViewer) {
  const [selectedRepIdx, setSelectedRepIdx] = React.useState<number>(0);
  const [isHideZeroTickets, setIsHideZeroTickets] = React.useState(false);
  const [isFiltersModalShow, setIsFiltersModalShow] = React.useState(false);
  const [filteredTicketIds, setFilteredTicketIds] = React.useState<Set<string>>(new Set());
  const [shownWebhubStores, setShownWebhubStores] = React.useState(
    props.reps_to_store[selectedRepIdx].webhub_stores
  );
  const [storeFilterValue, setStoreFilterValue] = React.useState("");
  const [isShowMap, setIsShowMap] = React.useState(false);

  const djangoContext = React.useContext(Context);

  if (props.reps_to_store.length === 0) {
    return (
      <Layout title="Territory Viewer" navbar={<NavigationBar />}>
        <section className="mw-rem-60 mx-auto p-2 px-3">
          <div className="alert alert-info display-6 text-center">
            New Cycle. No Info Syncced yet!
          </div>
        </section>
      </Layout>
    );
  }

  let totalMinutesOfWork = 0;
  shownWebhubStores.forEach((store) => {
    const [storeTotalTime] = getStoreWorktimeMinutes(
      store.current_pending_mplan_ids,
      filteredTicketIds,
      props.current_mplans
    );

    totalMinutesOfWork += storeTotalTime;
  });

  const LazyMap = React.lazy(() => import("@client/components/surveyWorker/TerritoryMap"));

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

  let numStoresShown = shownWebhubStores.length;
  if (isHideZeroTickets) {
    numStoresShown -= shownWebhubStores.filter((store) =>
      isHasWebhubStoreNoTickets(store, filteredTicketIds)
    ).length;
  }

  React.useEffect(() => {
    const timeoutVal = setTimeout(() => {
      const filteredStores = props.reps_to_store[selectedRepIdx].webhub_stores.filter((store) => {
        const fullStoreName = `${store.City}, ${store.State} | ${store.Address} | ${store.Name}`;
        return fullStoreName.toLowerCase().includes(storeFilterValue.toLowerCase());
      });
      setShownWebhubStores(() => filteredStores);
    }, 300);

    return () => {
      clearTimeout(timeoutVal);
    };
  }, [storeFilterValue]);

  return (
    <Layout
      title="Territory Viewer"
      navbar={<NavigationBar />}
      extraExternalStyles={[
        {
          src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
          integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        },
      ]}
    >
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
            onChange={(e) => {
              setSelectedRepIdx(() => parseInt(e.target.value));
              setShownWebhubStores(
                () => props.reps_to_store[parseInt(e.target.value)].webhub_stores
              );
            }}
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
        <div className="fw-bold my-1 mb-3 text-white">
          Total: {Math.floor(totalMinutesOfWork / 60)} hr {totalMinutesOfWork % 60.0} min
        </div>
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

        <button
          type="button"
          className="btn btn-primary d-block my-2"
          onClick={() => setIsShowMap((prev) => !prev)}
        >
          <img src={`${djangoContext.STATIC_URL}public/geo-alt-fill.svg`} alt="Next" />
          &nbsp;&nbsp;
          {isShowMap == true ? "Hide map" : "Show map"}
        </button>

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

        {isShowMap && (
          <React.Suspense fallback={<div>Loading...</div>}>
            <LazyMap
              key={selectedRepIdx}
              stores={shownWebhubStores}
              filteredTicketIds={filteredTicketIds}
              isHideZeroTickets={isHideZeroTickets}
              currentTickets={props.current_mplans}
            />
          </React.Suspense>
        )}

        <div className="my-2">
          <input
            type="text"
            id="filter-stores"
            className="form-control"
            placeholder="Filter by Store"
            value={storeFilterValue}
            onChange={(e) => setStoreFilterValue(() => e.target.value)}
          />
        </div>

        <div className="list-group list-group-numbered my-1">
          {shownWebhubStores.map((store) => {
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
