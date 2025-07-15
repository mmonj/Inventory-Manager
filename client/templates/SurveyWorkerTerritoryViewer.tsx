import React from "react";

import { Context, templates } from "@reactivated";

import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format, parse } from "date-fns/esm";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import {
  IStoreModalData,
  StoreDetailsModal,
} from "@client/components/surveyWorker/StoreDetailsModal";
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

export default function Template (props: templates.SurveyWorkerTerritoryViewer) {
  const [selectedRepIdx, setSelectedRepIdx] = React.useState<number>(0);
  const [isHideZeroTickets, setIsHideZeroTickets] = React.useState(false);
  const [isFiltersModalShow, setIsFiltersModalShow] = React.useState(false);
  const [filteredTicketIds, setFilteredTicketIds] = React.useState<Set<string>>(new Set());
  const [shownWebhubStores, setShownWebhubStores] = React.useState<
    templates.SurveyWorkerTerritoryViewer["rep_stores"][number]["webhub_stores"]
  >([]);
  const [storeFilterValue, setStoreFilterValue] = React.useState("");
  const [isShowMap, setIsShowMap] = React.useState(false);
  const [storeModalData, setStoreModalData] = React.useState<IStoreModalData | null>(null);
  const [isCmklaunchUrlsShown, setIsCmklaunchUrlsShown] = React.useState(false);

  const djangoContext = React.useContext(Context);

  React.useEffect(() => {
    const timeoutVal = setTimeout(() => {
      const filteredStores = props.rep_stores[selectedRepIdx].webhub_stores.filter((store) => {
        const fullStoreName = `${store.City}, ${store.State} | ${store.Address} | ${store.Name}`;
        return fullStoreName.toLowerCase().includes(storeFilterValue.toLowerCase());
      });
      setShownWebhubStores(() => filteredStores);
    }, 300);

    return () => {
      clearTimeout(timeoutVal);
    };
  }, [storeFilterValue]);

  React.useEffect(() => {
    setShownWebhubStores(() => props.rep_stores[selectedRepIdx].webhub_stores);
  }, []);

  if (props.rep_stores.length === 0) {
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
        props.rep_stores[selectedRepIdx].current_pending_mplan_ids.some((repTicketId) =>
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

  function toggleShowOriginalCmklaunchUrls() {
    setIsCmklaunchUrlsShown((prev) => !prev);
  }

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
        <h1 className="text-center my-2 mb-4">Territory Viewer</h1>

        <div className="alert alert-info">
          <div className="survey-launcher-info mb-4">
            <div className="h3 fw-bold text-decoration-underline">Survey Launcher Info</div>
            <div>
              <strong>Showing Cycle:</strong>{" "}
              {format(
                parse(props.survey_launcher_data.cycle_start_date, "yyyy-MM-dd", new Date()),
                "MMM d, yyyy"
              )}
            </div>
            <div>
              <strong>Survey URLs Last Syncced:</strong>{" "}
              {getTimeAgo(
                props.survey_launcher_data.cmk_stores_refresh_data.datetime_last_refreshed
              )}
            </div>
            <div>
              <strong>Cmklaunch URL Pool:</strong>{" "}
              {props.survey_launcher_data.cmklaunch_urls.length}{" "}
              <button
                onClick={toggleShowOriginalCmklaunchUrls}
                type="button"
                className="btn btn-secondary py-0 px-1"
              >
                {!isCmklaunchUrlsShown ? "Show" : "Hide"}
              </button>
            </div>

            {isCmklaunchUrlsShown && (
              <div className="mt-2 p-2 border border-secondary rounded">
                <h5 className="text-dark">Original Cmklaunch URLs</h5>
                {props.survey_launcher_data.cmklaunch_urls.map((cmklaunchUrl, idx) => (
                  <a
                    key={idx}
                    href={cmklaunchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="d-block text-secondary py-1"
                    style={{
                      overflow: "auto",
                    }}
                  >
                    {cmklaunchUrl}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="territory-info mb-4">
            <div className="h3 fw-bold text-decoration-underline">
              {props.rep_stores[selectedRepIdx].rep_name}&apos;s territory
            </div>
            <div>
              <strong>Total Work Hours: </strong>
              {Math.floor(totalMinutesOfWork / 60)} hr {totalMinutesOfWork % 60.0} min
            </div>
            <div>
              <strong>Last Syncced</strong>:{" "}
              {getTimeAgo(props.rep_stores[selectedRepIdx].last_syncced)}
            </div>
            <div className="mb-3">
              <strong>{numStoresShown} stores shown</strong>
            </div>

            <div>
              <label htmlFor="rep-select" className="form-label fw-semibold">
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
                    () => props.rep_stores[parseInt(e.target.value)].webhub_stores
                  );
                }}
              >
                {props.rep_stores.map((repStoreData, idx) => (
                  <option key={repStoreData.rep_id} value={idx}>
                    {repStoreData.rep_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
          <React.Suspense fallback={<div>Loading Map...</div>}>
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
          <div className="input-group">
            <input
              type="text"
              id="filter-stores"
              className="form-control"
              placeholder="Filter by Store"
              value={storeFilterValue}
              onChange={(e) => setStoreFilterValue(() => e.target.value)}
            />
            {storeFilterValue !== "" && (
              <button
                type="button"
                className="btn bg-transparent"
                style={{ marginLeft: "-40px", zIndex: "100" }}
                onClick={() => setStoreFilterValue("")}
              >
                <FontAwesomeIcon icon={faTimes} color={"#d9d9d9"} />
              </button>
            )}
          </div>
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
                setStoreModalData={setStoreModalData}
              />
            );
          })}
        </div>

        <StoreDetailsModal
          storeData={storeModalData}
          setStoreData={setStoreModalData}
          surveyLauncherData={props.survey_launcher_data}
        />

        <TerritoryFiltersModal
          isShow={isFiltersModalShow}
          setIsShow={setIsFiltersModalShow}
          isHideZeroTickets={isHideZeroTickets}
          setIsHideZeroTickets={setIsHideZeroTickets}
          filteredTicketIds={filteredTicketIds}
          setFilteredTicketIds={setFilteredTicketIds}
          currentTickets={props.current_mplans}
          currentRepTicketIds={props.rep_stores[selectedRepIdx].current_pending_mplan_ids}
        />
      </section>
    </Layout>
  );
}
