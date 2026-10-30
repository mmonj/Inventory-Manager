import React, {
  Suspense,
  lazy,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";
import { Alert, Dropdown, DropdownButton, ListGroup, Modal, Spinner, Table } from "react-bootstrap";

import {
  faArrowsRotate,
  faFilter,
  faMapLocationDot,
  faTimes,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { StoreList } from "@client/components/qtSurveyWorker/StoreList";
import { TerritoryFilterModal } from "@client/components/qtSurveyWorker/TerritoryFilterModal";
import { TerritoryFiltersActiveBanner } from "@client/components/qtSurveyWorker/TerritoryFiltersActiveBanner";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { fetchByReactivated, getErrorList } from "@client/util/commonUtil";
import {
  TRepTerritoryData,
  TTerritoryRep,
  buildTerritoryView,
} from "@client/util/qtSurveyWorker/territoryView";
import {
  TTerritorySelection,
  restoreTerritorySelection,
  toStoredTerritorySelection,
} from "@client/util/qtSurveyWorker/territorySelection";
import { toast } from "@client/util/toast";

const TerritoryMap = lazy(() => import("@client/components/qtSurveyWorker/TerritoryMapGMaps"));

const RELATIVE_TIME_THRESHOLD_HOURS = 12;
const LAST_SELECTED_REP_ID_KEY = "lastSelectedRepId";
const COMBINED_TERRITORY_LABEL = "All Field Reps";

interface TLoadState {
  isLoading: boolean;
  isError: boolean;
  errorMessages: string[];
}

const IDLE_LOAD_STATE: TLoadState = { isLoading: false, isError: false, errorMessages: [] };

type TRepDataRequestResult =
  | { isSuccess: true; repData: interfaces.QtTerritoryRepData }
  | { isSuccess: false; errorMessages: string[] };

async function requestTerritoryRepData(
  repId: number,
  useCache: string | null,
  csrfToken: string
): Promise<TRepDataRequestResult> {
  const baseUrl = reverse("survey_worker:qt_territory_rep_data", { rep_id: repId });
  const url = useCache !== null ? `${baseUrl}?use_cache=${useCache}` : baseUrl;

  try {
    const response = await fetchByReactivated<interfaces.QtTerritoryRepData>(url, csrfToken, "GET");
    if (!response.ok) {
      const errorMessages = await getErrorList(
        response as unknown as ApiResponse<IHttpError | TNotFoundErrorList>
      );
      return { isSuccess: false, errorMessages };
    }
    return { isSuccess: true, repData: await response.json() };
  } catch (error) {
    return {
      isSuccess: false,
      errorMessages: [error instanceof Error ? error.message : "Unexpected error occurred"],
    };
  }
}

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

export function Template(props: templates.QtTerritoryViewer) {
  // Chosen on mount (see below) rather than here, so the first rep isn't fetched before the
  // last selection is restored from localStorage
  const [selection, setSelection] = useState<TTerritorySelection | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showStoresWithoutPendingServiceOrders, setShowStoresWithoutPendingServiceOrders] =
    useState(true);
  // In memory only: survive Refresh Schedule and switching reps, reset on page reload.
  const [excludedParentCompanies, setExcludedParentCompanies] = useState<Set<string>>(new Set());
  const [excludedRepIds, setExcludedRepIds] = useState<Set<number>>(new Set());
  // Per-rep schedule/recently-seen-store data, fetched on demand via qt_territory_rep_data
  // (territory_rep_data_view), keyed by QtRepDetail.id. Once a rep's data has been fetched,
  // reselecting it (or the combined territory) does not refetch - that's what the Refresh
  // button (use_cache=off) is for.
  const [repDataById, setRepDataById] = useState<Map<number, interfaces.QtTerritoryRepData>>(
    new Map()
  );
  const [loadState, setLoadState] = useState<TLoadState>(IDLE_LOAD_STATE);
  // Bumped by every loadRepData call, so a load overtaken by a newer one (e.g. switching reps
  // mid-load) still stores the data it fetched but no longer reports on loadState
  const latestLoadIdRef = useRef(0);
  const djangoContext = React.useContext(Context);

  const isCombinedTerritory = selection?.kind === "combinedTerritory";
  const allReps: TTerritoryRep[] = props.rep_details;
  const selectedRepDetail =
    selection?.kind === "fieldRep"
      ? props.rep_details.find((repDetail) => repDetail.id === selection.repId)
      : undefined;
  const shownReps: TTerritoryRep[] = isCombinedTerritory
    ? allReps
    : selectedRepDetail !== undefined
      ? [selectedRepDetail]
      : [];
  const selectionLabel = isCombinedTerritory
    ? COMBINED_TERRITORY_LABEL
    : (selectedRepDetail?.username ?? "Select Representative");
  const selectedRepData =
    selectedRepDetail === undefined ? undefined : repDataById.get(selectedRepDetail.id);
  // Lets the store list and map lag behind fast typing instead of blocking the input.
  const deferredSearchText = useDeferredValue(searchText);

  const repTerritories: TRepTerritoryData[] = useMemo(
    () => shownReps.map((rep) => ({ rep, repData: repDataById.get(rep.id) })),
    [selection, repDataById]
  );
  const territoryView = useMemo(
    () =>
      buildTerritoryView(repTerritories, {
        searchText: deferredSearchText,
        selectedDueDate,
        excludedParentCompanies,
        showStoresWithoutPendingServiceOrders,
        // The rep filter only applies to the combined territory
        excludedRepIds: isCombinedTerritory ? excludedRepIds : new Set(),
      }),
    [
      repTerritories,
      deferredSearchText,
      selectedDueDate,
      excludedParentCompanies,
      showStoresWithoutPendingServiceOrders,
      isCombinedTerritory,
      excludedRepIds,
    ]
  );
  const { activeFilterSummary } = territoryView;
  // The unscheduled-date sentinel is the same in every rep's schedule, so any loaded one will do.
  const unscheduledDate = repTerritories.find(({ repData }) => repData?.schedule != null)?.repData
    ?.schedule?.UnscheduledDate;

  /**
   * Fetches the given reps' data one at a time. A rep that fails is reported in a toast and the
   * rest still load; the page only shows an error if every rep failed and none of them has data
   * on screen already.
   */
  async function loadRepData(reps: TTerritoryRep[], useCache: string | null): Promise<boolean> {
    latestLoadIdRef.current += 1;
    const loadId = latestLoadIdRef.current;
    const isAnyRepAlreadyShown = reps.some((rep) => repDataById.has(rep.id));
    setLoadState({ ...IDLE_LOAD_STATE, isLoading: true });
    const isForCombinedTerritory = reps.length > 1;
    const failureMessages: string[] = [];
    let failedRepCount = 0;

    for (const rep of reps) {
      const result = await requestTerritoryRepData(rep.id, useCache, djangoContext.csrf_token);
      const repLabel = isForCombinedTerritory ? `${rep.username}: ` : "";

      if (!result.isSuccess) {
        failedRepCount += 1;
        failureMessages.push(...result.errorMessages.map((message) => repLabel + message));
        continue;
      }

      if (result.repData.sync_error !== null) {
        toast.warning(repLabel + result.repData.sync_error);
      }
      setRepDataById((current) => new Map(current).set(rep.id, result.repData));
    }

    if (loadId !== latestLoadIdRef.current) {
      return false;
    }
    if (failedRepCount > 0 && failedRepCount === reps.length && !isAnyRepAlreadyShown) {
      setLoadState({ isLoading: false, isError: true, errorMessages: failureMessages });
      return false;
    }
    for (const message of failureMessages) {
      toast.warning(message);
    }
    setLoadState(IDLE_LOAD_STATE);
    return failedRepCount === 0;
  }

  // Fetch whichever shown reps we haven't already fetched whenever the selection changes -
  // reselecting already-loaded reps does not refetch (Refresh Schedule is the only way to force
  // a fresh fetch once loaded). The combined territory reads stored schedules only; a single
  // rep honours the page URL's use_cache param.
  useEffect(() => {
    const repsToFetch = shownReps.filter((rep) => !repDataById.has(rep.id));
    if (repsToFetch.length === 0) {
      return;
    }

    const useCache = isCombinedTerritory
      ? "on"
      : new URLSearchParams(window.location.search).get("use_cache");
    void loadRepData(repsToFetch, useCache);
    // loadRepData/repDataById intentionally excluded - this should only re-run when the
    // selection itself changes, not on every fetch-state/cache update it causes
  }, [selection]);

  // Restore the last selection on mount, falling back to the first rep
  useEffect(() => {
    const restoredSelection = restoreTerritorySelection(
      localStorage.getItem(LAST_SELECTED_REP_ID_KEY),
      props.rep_details.map((rep) => rep.id)
    );
    if (restoredSelection !== null) {
      setSelection(restoredSelection);
      return;
    }
    const firstRep = props.rep_details.at(0);
    setSelection(firstRep === undefined ? null : { kind: "fieldRep", repId: firstRep.id });
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

  function handleSelectionChange(nextSelection: TTerritorySelection) {
    setSearchText("");
    setSelection(nextSelection);
    localStorage.setItem(LAST_SELECTED_REP_ID_KEY, toStoredTerritorySelection(nextSelection));
  }

  async function handleRefreshSchedule() {
    if (shownReps.length === 0) {
      return;
    }

    const isSuccess = await loadRepData(shownReps, "off");
    if (isSuccess) {
      toast.success(isCombinedTerritory ? "Schedules refreshed." : "Schedule refreshed.");
    }
  }

  return (
    <Layout navbar={<NavigationBar />} title="Territory Viewer">
      <div className="container mt-4">
        <h2 className="mb-4">Territory Viewer</h2>

        <div className="mb-4">
          <div className="mb-3">
            <label className="form-label fw-semibold">Field Representative:</label>
            <DropdownButton
              id="rep-select"
              title={selectionLabel}
              variant="secondary"
              className="w-100"
            >
              <Dropdown.Header>Field Reps</Dropdown.Header>
              <Dropdown.Item
                onClick={() => handleSelectionChange({ kind: "combinedTerritory" })}
                active={isCombinedTerritory}
              >
                {COMBINED_TERRITORY_LABEL}
              </Dropdown.Item>
              {props.rep_details.map((rep) => (
                <Dropdown.Item
                  key={rep.id}
                  onClick={() => handleSelectionChange({ kind: "fieldRep", repId: rep.id })}
                  active={selectedRepDetail?.id === rep.id}
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
              disabled={selection === null}
              fetchState={loadState}
              onClick={() => void handleRefreshSchedule()}
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="me-1" />
              Refresh Schedule
            </ButtonWithSpinner>
            {!loadState.isLoading && (
              <button
                type="button"
                className={`btn btn-sm ${activeFilterSummary.isAnyFilterActive ? "btn-warning" : "btn-outline-secondary"}`}
                onClick={() => setShowFilters(true)}
              >
                <FontAwesomeIcon icon={faFilter} className="me-1" />
                Filters
              </button>
            )}
          </div>
        </div>

        <TerritoryFiltersActiveBanner
          activeFilterSummary={activeFilterSummary}
          onEditFilters={() => setShowFilters(true)}
          className="mb-3 rounded"
        />

        {/* Everything below depends on the selected rep's schedule data - while a fetch is in
        flight (initial load or Refresh Schedule), show a loading card in its place instead of
        rendering stats/filters/the map button against data that's missing or about to change. */}
        {loadState.isError && repTerritories.every(({ repData }) => repData === undefined) ? (
          <Alert variant="danger" className="d-flex">
            <FontAwesomeIcon icon={faTriangleExclamation} className="fs-3 me-3 flex-shrink-0" />
            <div>
              <Alert.Heading as="h4" className="fw-bold">
                Failed to fetch territory data
              </Alert.Heading>
              <ListGroup variant="flush">
                {loadState.errorMessages.map((message, idx) => (
                  <ListGroup.Item key={idx} variant="danger" className="px-0 py-1 border-0">
                    {message}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          </Alert>
        ) : loadState.isLoading ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 my-3 bg-body-tertiary border rounded-3">
            <Spinner animation="border" role="status" style={{ width: "3.5rem", height: "3.5rem" }}>
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <div className="fs-4 fw-semibold mt-3">Loading territory data…</div>
            <div className="text-muted">Fetching data for {selectionLabel}</div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div>
                <strong>
                  {Object.keys(territoryView.stores).length +
                    territoryView.recentlySeenStores.length}{" "}
                  stores shown
                </strong>
                {!isCombinedTerritory && (
                  <div className="text-secondary">
                    Schedule last refreshed:{" "}
                    {selectedRepData?.rep_sync_data.schedule_last_refreshed != null
                      ? formatLastRefreshed(selectedRepData.rep_sync_data.schedule_last_refreshed)
                      : "N/A"}
                  </div>
                )}
              </div>
              <div>
                <strong>Total Work Hours: </strong>
                {territoryView.totalWorkHours.toFixed(2)} hrs
              </div>
            </div>

            {isCombinedTerritory && territoryView.repSummaries.length > 0 && (
              <Table size="sm" responsive className="mb-4">
                <thead>
                  <tr>
                    <th>Field Rep</th>
                    <th className="text-end">Stores</th>
                    <th className="text-end">Hours</th>
                    <th>Schedule last refreshed</th>
                  </tr>
                </thead>
                <tbody>
                  {territoryView.repSummaries.map((repSummary) => (
                    <tr key={repSummary.rep.id}>
                      <td>{repSummary.rep.username}</td>
                      <td className="text-end">{repSummary.storeCount}</td>
                      <td className="text-end">{repSummary.totalWorkHours.toFixed(2)}</td>
                      <td className="text-secondary">
                        {repSummary.scheduleLastRefreshed !== null
                          ? formatLastRefreshed(repSummary.scheduleLastRefreshed)
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

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
                  territoryView.selectedDueDate === null
                    ? "All Dates"
                    : new Date(territoryView.selectedDueDate).toLocaleDateString()
                }
                variant="secondary"
                className="w-100"
              >
                <Dropdown.Item
                  onClick={() => setSelectedDueDate(null)}
                  active={territoryView.selectedDueDate === null}
                >
                  All Dates
                </Dropdown.Item>
                {territoryView.dueDateOptions.map((date) => (
                  <Dropdown.Item
                    key={date}
                    onClick={() => setSelectedDueDate(date)}
                    active={territoryView.selectedDueDate === date}
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
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText !== "" && (
                  <button
                    type="button"
                    className="btn bg-transparent"
                    style={{ marginLeft: "-40px", zIndex: "100" }}
                    onClick={() => setSearchText("")}
                  >
                    <FontAwesomeIcon icon={faTimes} color={"#d9d9d9"} />
                  </button>
                )}
              </div>
            </div>

            {/* territory map */}
            {selection !== null && (
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
                    Map: {selectionLabel}
                  </Modal.Title>
                </Modal.Header>
                <TerritoryFiltersActiveBanner
                  activeFilterSummary={activeFilterSummary}
                  onEditFilters={() => setShowFilters(true)}
                />
                <Modal.Body className="p-0" style={{ height: "70vh" }}>
                  <Suspense fallback={<div>Loading map...</div>}>
                    <TerritoryMap
                      stores={territoryView.stores}
                      recentlySeenStores={territoryView.recentlySeenStores}
                      // No home pins for the combined territory
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
                      showRepNames={isCombinedTerritory}
                    />
                  </Suspense>
                </Modal.Body>
              </Modal>
            )}

            {/* store list */}
            <StoreList
              stores={territoryView.stores}
              unscheduledDate={unscheduledDate}
              recentlySeenStores={territoryView.recentlySeenStores}
              showRepNames={isCombinedTerritory}
            />
          </>
        )}

        <TerritoryFilterModal
          show={showFilters}
          onHide={() => setShowFilters(false)}
          showStoresWithoutPendingServiceOrders={showStoresWithoutPendingServiceOrders}
          onChange={setShowStoresWithoutPendingServiceOrders}
          parentCompanies={territoryView.parentCompanies}
          excludedParentCompanies={excludedParentCompanies}
          onChangeExcludedParentCompanies={setExcludedParentCompanies}
          reps={isCombinedTerritory ? allReps : null}
          excludedRepIds={excludedRepIds}
          onChangeExcludedRepIds={setExcludedRepIds}
        />
      </div>
    </Layout>
  );
}
