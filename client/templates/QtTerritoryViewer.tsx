import React, { Suspense, lazy, useEffect, useState } from "react";

import {
  Context,
  SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  interfaces,
  reverse,
  templates,
} from "@reactivated";
import { Alert, Dropdown, DropdownButton, ListGroup, Modal, Spinner } from "react-bootstrap";

import {
  faArrowsRotate,
  faMapLocationDot,
  faTimes,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { StoreList } from "@client/components/qtSurveyWorker/StoreList";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";
import { matchesSearch } from "@client/util/qtSurveyWorker/scheduleUtils";
import { toast } from "@client/util/toast";

// const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMapLeaflet"));
const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMapGMaps"));

const RELATIVE_TIME_THRESHOLD_HOURS = 12;
const LAST_SELECTED_REP_ID_KEY = "lastSelectedRepId";

function formatLastRefreshed(isoString: string): string {
  const refreshedDate = new Date(isoString);
  const hoursSince = (Date.now() - refreshedDate.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 0 || hoursSince >= RELATIVE_TIME_THRESHOLD_HOURS) {
    return refreshedDate.toLocaleString();
  }

  if (hoursSince < 1) {
    const minutesSince = Math.max(1, Math.floor(hoursSince * 60));
    if (minutesSince < 2) {
      return "Just now";
    }
    return `${minutesSince} minutes ago`;
  }

  const wholeHoursSince = Math.floor(hoursSince);
  return `${wholeHoursSince} hour${wholeHoursSince === 1 ? "" : "s"} ago`;
}

type TGroupedStoreRecord = Record<
  number,
  {
    address: SurveyWorkerQtraxWebsiteTypedefsAddress;
    jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
  }
>;

export function Template(props: templates.QtTerritoryViewer) {
  const [selectedRepId, setSelectedRepId] = useState<number | null>(
    props.rep_details[0]?.id ?? null
  );
  const [showMap, setShowMap] = useState(false);
  const [storeFilterValue, setStoreFilterValue] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState<string>("");
  const [filteredStores, setFilteredStores] = useState<TGroupedStoreRecord>({});
  const [filteredNoCurrentTicketStores, setFilteredNoCurrentTicketStores] = useState<
    SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore[]
  >([]);
  // Per-rep schedule/recently-seen-store data, fetched on demand via qt_territory_rep_data
  // (territory_rep_data_view), keyed by QtRepDetail.id - the same id selectedRepId holds.
  // Once a rep's data has been fetched, reselecting it from the dropdown does not refetch -
  // that's what the Refresh button (use_cache=off) is for.
  const [repDataById, setRepDataById] = useState<Map<number, interfaces.QtTerritoryRepData>>(
    new Map()
  );
  const territoryRepDataFetch = useFetch<interfaces.QtTerritoryRepData>();
  const djangoContext = React.useContext(Context);

  const selectedRepDetail = props.rep_details.find((r) => r.id === selectedRepId);
  const selectedRepData = selectedRepId === null ? undefined : repDataById.get(selectedRepId);
  const serviceOrders = selectedRepData?.rep_sync_data.schedule?.ServiceOrders ?? [];

  async function fetchTerritoryRepData(repId: number, useCacheOverride?: "off") {
    const baseUrl = reverse("survey_worker:qt_territory_rep_data", { rep_id: repId });
    // useCacheOverride overrides the page URL's use_cache param
    const useCache =
      useCacheOverride ?? new URLSearchParams(window.location.search).get("use_cache");
    const url = useCache !== null ? `${baseUrl}?use_cache=${useCache}` : baseUrl;

    const [isSuccess, result] = await territoryRepDataFetch.fetchData(() =>
      fetchByReactivated<interfaces.QtTerritoryRepData>(url, djangoContext.csrf_token, "GET")
    );

    if (!isSuccess) {
      return false;
    }

    setRepDataById((current) => {
      const next = new Map(current);
      next.set(repId, result);
      return next;
    });

    return true;
  }

  // get unique due dates and sort them, excluding weekdays
  const uniqueDueDates = React.useMemo(() => {
    const dates = serviceOrders
      .map((so) => so.DateScheduleRangeEndOriginal)
      .filter((date): date is string => Boolean(date))
      .filter((date) => {
        const dayOfWeek = new Date(date).getDay();
        // include only dates that fall in on either sunday or saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // remove duplicates
    return [...new Set(dates)];
  }, [serviceOrders]);

  // track if initial date already set to avoid overriding user selection
  const initialDateSet = React.useRef(false);

  // group stores
  const groupedByStore = React.useMemo(() => {
    const _groupedByStore: TGroupedStoreRecord = {};

    for (const so of serviceOrders) {
      const siteId = so.Address.SiteId;
      if (!(siteId in _groupedByStore)) {
        _groupedByStore[siteId] = { address: so.Address, jobs: [] };
      }
      _groupedByStore[siteId].jobs.push(so);
    }

    return _groupedByStore;
  }, [serviceOrders]);

  // Recently-seen stores for the selected rep (already scoped to this rep by the ajax
  // response), deduped against groupedByStore so a store never gets both a green and red pin.
  const recentlySeenStores = React.useMemo(() => {
    if (selectedRepData === undefined) {
      return [];
    }

    return selectedRepData.recently_seen_stores.filter(
      (store) => store.site_id === null || !(store.site_id in groupedByStore)
    );
  }, [selectedRepData, groupedByStore]);

  let totalWorkHours = 0;
  Object.values(filteredStores).forEach(({ jobs }) => {
    jobs.forEach((job) => {
      totalWorkHours += job.EstimatedTime;
    });
  });

  // filter stores
  useEffect(() => {
    const timeoutVal = setTimeout(() => {
      const filtered: TGroupedStoreRecord = {};

      Object.entries(groupedByStore).forEach(([siteId, storeData]) => {
        // filter by store name + address + job descriptions
        const fullStoreName = `${storeData.address.City}, ${storeData.address.State} | ${storeData.address.StreetAddress} | ${storeData.address.StoreName}`;
        const jobDescriptions = storeData.jobs
          .map((job) => job.ServiceOrderDescription || "")
          .join(" ");
        const searchableText = `${fullStoreName} ${jobDescriptions}`;

        const matchesStoreFilter = matchesSearch(searchableText, storeFilterValue);

        // filter by due date
        const matchesDueDate =
          selectedDueDate === ""
            ? true // If no due date selected, show all
            : storeData.jobs.some((job) => {
                const jobDueDate = job.DateScheduleRangeEndOriginal;
                if (!jobDueDate) return false;

                return new Date(jobDueDate) <= new Date(selectedDueDate);
              });

        // only include if both filters match
        if (matchesStoreFilter && matchesDueDate) {
          filtered[Number(siteId)] = {
            address: storeData.address,
            jobs: storeData.jobs.filter((job) => {
              // if a due date is selected, only include jobs on or before that date
              if (selectedDueDate !== "" && job.DateScheduleRangeEndOriginal) {
                return new Date(job.DateScheduleRangeEndOriginal) <= new Date(selectedDueDate);
              }
              return true;
            }),
          };
        }
      });

      setFilteredStores(filtered);

      // Stores with no assigned tickets: have no jobs to filter by due date, so only the search box
      // applies, so the 'due date' filter doesn't hide them
      setFilteredNoCurrentTicketStores(
        recentlySeenStores.filter((store) => {
          const searchableText = `${store.city}, ${store.state} | ${store.address_1} | ${store.name}`;
          return matchesSearch(searchableText, storeFilterValue);
        })
      );
    }, 300);

    return () => clearTimeout(timeoutVal);
  }, [storeFilterValue, groupedByStore, selectedDueDate, recentlySeenStores]);

  useEffect(() => {
    setFilteredStores(groupedByStore);
    setFilteredNoCurrentTicketStores(recentlySeenStores);
    // reset the initial date flag when rep changes
    initialDateSet.current = false;
  }, [selectedRepId]);

  // Fetch the selected rep's data whenever selection changes to a rep we haven't already
  // fetched - reselecting an already-loaded rep does not refetch (Refresh Schedule is the only
  // way to force a fresh fetch once loaded).
  useEffect(() => {
    if (selectedRepId === null || repDataById.has(selectedRepId)) {
      return;
    }

    void fetchTerritoryRepData(selectedRepId);
    // fetchTerritoryRepData/repDataById intentionally excluded - this should only re-run when
    // the selected rep id itself changes, not on every fetch-state/cache update it causes
  }, [selectedRepId]);

  // load last selected representative ID on mount
  useEffect(() => {
    const lastSelectedRepId = localStorage.getItem(LAST_SELECTED_REP_ID_KEY);
    if (lastSelectedRepId !== null && lastSelectedRepId !== "") {
      const storedId = parseInt(lastSelectedRepId);

      if (!isNaN(storedId) && props.rep_details.some((rep) => rep.id === storedId)) {
        setSelectedRepId(storedId);
      }
    }
  }, []);

  if (props.rep_details.length === 0) {
    return (
      <Layout title="Territory Viewer" navbar={<NavigationBar />}>
        <div className="container mt-4">
          <div className="card text-center py-5">
            <div className="card-body">
              <FontAwesomeIcon icon={faMapLocationDot} size="3x" className="mb-3 opacity-50" />
              <h4 className="card-title mb-2">No territory data available</h4>
              <p className="card-text mb-0 text-secondary">
                No enabled field representative has synced schedule data for the current work cycle
                yet.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  function handleRepChange(repId: number) {
    setStoreFilterValue("");
    setSelectedRepId(repId);

    localStorage.setItem(LAST_SELECTED_REP_ID_KEY, repId.toString());
  }

  async function handleRefreshSchedule() {
    if (selectedRepId === null) {
      return;
    }

    const isSuccess = await fetchTerritoryRepData(selectedRepId, "off");
    if (isSuccess) {
      toast.success("Schedule refreshed.");
    }
  }

  return (
    <Layout
      navbar={<NavigationBar />}
      title="Territory Viewer"
      extraExternalStyles={[
        {
          src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
          integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        },
      ]}
    >
      <div className="container mt-4">
        <h2 className="mb-4">Territory Viewer</h2>

        <div className="mb-4">
          <div className="mb-3">
            <label className="form-label fw-semibold">Field Representative:</label>
            <DropdownButton
              id="rep-select"
              title={selectedRepDetail?.username ?? "Select Representative"}
              variant="secondary"
              className="w-100"
            >
              {props.rep_details.map((rep) => (
                <Dropdown.Item
                  key={rep.id}
                  onClick={() => handleRepChange(rep.id)}
                  active={selectedRepId === rep.id}
                >
                  {rep.username}
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </div>

          <div className="text-secondary d-flex align-items-center gap-2">
            <ButtonWithSpinner
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={selectedRepId === null}
              fetchState={territoryRepDataFetch}
              onClick={() => void handleRefreshSchedule()}
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="me-1" />
              Refresh Schedule
            </ButtonWithSpinner>
          </div>
        </div>

        {/* Everything below depends on the selected rep's schedule data - while it's still
        loading (no cached data yet for this rep), show a loading card in its place instead of
        rendering stats/filters/the map button against data that isn't there yet. */}
        {territoryRepDataFetch.isError && selectedRepData === undefined ? (
          <Alert variant="danger" className="d-flex">
            <FontAwesomeIcon icon={faTriangleExclamation} className="fs-3 me-3 flex-shrink-0" />
            <div>
              <Alert.Heading as="h4" className="fw-bold">
                Failed to fetch territory data
              </Alert.Heading>
              <ListGroup variant="flush">
                {territoryRepDataFetch.errorMessages.map((message, idx) => (
                  <ListGroup.Item key={idx} variant="danger" className="px-0 py-1 border-0">
                    {message}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          </Alert>
        ) : territoryRepDataFetch.isLoading && selectedRepData === undefined ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 my-3 bg-body-tertiary border rounded-3">
            <Spinner animation="border" role="status" style={{ width: "3.5rem", height: "3.5rem" }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="fs-4 fw-semibold mt-3">Loading territory data…</div>
            <div className="text-muted">
              Fetching data for {selectedRepDetail?.username ?? "rep"}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div>
                <strong>
                  {Object.keys(filteredStores).length + filteredNoCurrentTicketStores.length} stores
                  shown
                </strong>
                <div className="text-secondary">
                  Schedule last refreshed:{" "}
                  {selectedRepData?.rep_sync_data.schedule_last_refreshed != null
                    ? formatLastRefreshed(selectedRepData.rep_sync_data.schedule_last_refreshed)
                    : "N/A"}
                </div>
              </div>
              <div>
                <strong>Total Work Hours: </strong>
                {totalWorkHours.toFixed(2)} hrs
              </div>
            </div>

            <div className="mb-3">
              <button className="btn btn-primary" onClick={() => setShowMap((prev) => !prev)}>
                <img src={`${djangoContext.STATIC_URL}public/geo-alt-fill.svg`} alt="Map" />
                &nbsp;&nbsp;
                {showMap ? "Hide Map" : "Show Map"}
              </button>
            </div>

            <div className="mb-2">
              <label className="form-label fw-semibold">Show Tickets due by:</label>
              <DropdownButton
                id="due-date-select"
                title={
                  selectedDueDate === ""
                    ? "All Dates"
                    : new Date(selectedDueDate).toLocaleDateString()
                }
                variant="secondary"
                className="w-100"
              >
                <Dropdown.Item
                  onClick={() => {
                    initialDateSet.current = true;
                    setSelectedDueDate("");
                  }}
                  active={selectedDueDate === ""}
                >
                  All Dates
                </Dropdown.Item>
                {uniqueDueDates.map((date) => (
                  <Dropdown.Item
                    key={date}
                    onClick={() => {
                      initialDateSet.current = true;
                      setSelectedDueDate(date);
                    }}
                    active={selectedDueDate === date}
                  >
                    {new Date(date).toLocaleDateString()}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>

            <div className="mb-3">
              <div className="input-group">
                <input
                  type="text"
                  id="filter-stores"
                  className="form-control"
                  placeholder="Filter by Store + Address + Job Descriptions"
                  value={storeFilterValue}
                  onChange={(e) => setStoreFilterValue(e.target.value)}
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

            {/* territory map */}
            {selectedRepId !== null && (
              <Modal
                show={showMap}
                onHide={() => setShowMap(false)}
                backdrop="static"
                size="lg"
                aria-labelledby="map-modal"
                centered
              >
                <Modal.Header closeButton>
                  <Modal.Title id="map-modal" className="w-75 text-truncate">
                    Map: {selectedRepDetail?.username ?? "Unknown Rep"}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0" style={{ height: "70vh" }}>
                  <Suspense fallback={<div>Loading map...</div>}>
                    <TerritoryMap
                      groupedByStore={filteredStores}
                      recentlySeenStores={filteredNoCurrentTicketStores}
                      repAddress={
                        selectedRepDetail !== undefined && selectedRepDetail.address !== ""
                          ? {
                              repId: selectedRepDetail.id,
                              address: selectedRepDetail.address,
                              lat: selectedRepDetail.address_latitude,
                              lng: selectedRepDetail.address_longitude,
                            }
                          : null
                      }
                    />
                  </Suspense>
                </Modal.Body>
              </Modal>
            )}

            {/* store list */}
            <StoreList
              groupedByStore={filteredStores}
              unscheduledDate={selectedRepData?.rep_sync_data.schedule?.UnscheduledDate}
              noCurrentTicketStores={filteredNoCurrentTicketStores}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
