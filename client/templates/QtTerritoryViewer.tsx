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
import {
  Alert,
  Dropdown,
  DropdownButton,
  Form,
  ListGroup,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";

import {
  faArrowsRotate,
  faCheckDouble,
  faEllipsis,
  faFilter,
  faMapLocationDot,
  faPlus,
  faTimes,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { StoreList } from "@client/components/qtSurveyWorker/StoreList";
import { TerritoryFilterModal } from "@client/components/qtSurveyWorker/TerritoryFilterModal";
import { TerritoryFiltersActiveBanner } from "@client/components/qtSurveyWorker/TerritoryFiltersActiveBanner";
import { VisitSequenceModal } from "@client/components/qtSurveyWorker/VisitSequenceModal";
import {
  TSkipReason,
  TVisitSequenceStoreActions,
} from "@client/components/qtSurveyWorker/VisitSequenceOutcomeControls";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { fetchByReactivated, getErrorList } from "@client/util/commonUtil";
import {
  TRepTerritoryData,
  TTerritoryRep,
  TVisitSequenceInput,
  TVisitSequenceOutcome,
  buildTerritoryView,
} from "@client/util/qtSurveyWorker/territoryView";
import {
  TTerritorySelection,
  getDefaultVisitSequenceName,
  getPreselectedRepIds,
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

type TVisitSequence = templates.QtTerritoryViewer["visit_sequences"][number];

/** What the New Visit Sequence modal starts with. */
interface TNewVisitSequenceDraft {
  initialName: string;
  initialRepIds: number[];
}

/** The visit sequence being renamed or having its field reps edited, in the reused modal. */
interface TEditVisitSequenceDraft {
  visitSequence: TVisitSequence;
  shownFields: "name" | "reps";
}

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

type TRequestResult<T> =
  { isSuccess: true; payload: T } | { isSuccess: false; errorMessages: string[] };

/** Sends a form-encoded POST (or a GET without `requestBody`) and parses its JSON reply. */
async function sendJsonRequest<T>(
  url: string,
  csrfToken: string,
  requestBody?: URLSearchParams
): Promise<TRequestResult<T>> {
  try {
    const response =
      requestBody === undefined
        ? await fetchByReactivated<T>(url, csrfToken, "GET")
        : await fetchByReactivated<T>(
            url,
            csrfToken,
            "POST",
            requestBody,
            "application/x-www-form-urlencoded"
          );
    if (!response.ok) {
      const errorMessages = await getErrorList(
        response as unknown as ApiResponse<IHttpError | TNotFoundErrorList>
      );
      return { isSuccess: false, errorMessages };
    }
    return { isSuccess: true, payload: await response.json() };
  } catch (error) {
    return {
      isSuccess: false,
      errorMessages: [error instanceof Error ? error.message : "Unexpected error occurred"],
    };
  }
}

/** A visit sequence's outcomes, as last confirmed by the server. */
interface TLoadedVisitSequenceOutcomes {
  visitSequenceId: number;
  outcomesBySiteId: Map<number, TVisitSequenceOutcome>;
}

type TSaveVisitSequenceResult =
  | { isSuccess: true; visitSequence: TVisitSequence }
  | { isSuccess: false; errorMessages: string[] };

/** Creates or updates a visit sequence, depending on the url. */
async function requestSaveVisitSequence(
  url: string,
  name: string,
  repIds: number[],
  csrfToken: string
): Promise<TSaveVisitSequenceResult> {
  const requestBody = new URLSearchParams({ name });
  for (const repId of repIds) {
    requestBody.append("rep_ids", repId.toString());
  }

  const result = await sendJsonRequest<interfaces.QtVisitSequenceDetail>(
    url,
    csrfToken,
    requestBody
  );
  return result.isSuccess
    ? { isSuccess: true, visitSequence: result.payload.visit_sequence }
    : result;
}

/** A rep's "Mark all visited" action in a visit sequence, disabled once nothing is left. */
function MarkAllVisitedButton({
  remainingSiteIds,
  isMarking,
  isDisabled,
  onMarkAll,
}: {
  remainingSiteIds: number[];
  isMarking: boolean;
  isDisabled: boolean;
  onMarkAll: (remainingSiteIds: number[]) => void;
}) {
  return (
    <ButtonWithSpinner
      type="button"
      className="btn btn-sm btn-outline-success text-nowrap"
      fetchState={{ isLoading: isMarking, isError: false, errorMessages: [] }}
      disabled={isDisabled || remainingSiteIds.length === 0}
      onClick={() => onMarkAll(remainingSiteIds)}
    >
      <FontAwesomeIcon icon={faCheckDouble} className="me-1" />
      Mark all visited
    </ButtonWithSpinner>
  );
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
  // Starts from the SSR props; sequences created on this page are added to it.
  const [visitSequences, setVisitSequences] = useState<TVisitSequence[]>(props.visit_sequences);
  // Fetched each time a visit sequence is selected
  const [loadedVisitSequenceOutcomes, setLoadedVisitSequenceOutcomes] =
    useState<TLoadedVisitSequenceOutcomes | null>(null);
  // Not persisted: every page load starts on what's left to do
  const [showVisited, setShowVisited] = useState(false);
  /** The rep whose remaining stores are being marked visited, while the server answers. */
  const [markingAllVisitedRepId, setMarkingAllVisitedRepId] = useState<number | null>(null);
  const [newVisitSequenceDraft, setNewVisitSequenceDraft] = useState<TNewVisitSequenceDraft | null>(
    null
  );
  const [editVisitSequenceDraft, setEditVisitSequenceDraft] =
    useState<TEditVisitSequenceDraft | null>(null);
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
  const selectedVisitSequence =
    selection?.kind === "visitSequence"
      ? visitSequences.find((visitSequence) => visitSequence.id === selection.visitSequenceId)
      : undefined;
  // A visit sequence is shown like the combined territory of its field reps
  const isMultiRepView = isCombinedTerritory || selectedVisitSequence !== undefined;
  const shownReps: TTerritoryRep[] = isCombinedTerritory
    ? allReps
    : selectedVisitSequence !== undefined
      ? allReps.filter((rep) => selectedVisitSequence.rep_ids.includes(rep.id))
      : selectedRepDetail !== undefined
        ? [selectedRepDetail]
        : [];
  // Changes when the selection changes, and when the selected visit sequence's reps are edited
  const shownRepIdsKey = shownReps.map((rep) => rep.id).join(",");
  const selectionLabel = isCombinedTerritory
    ? COMBINED_TERRITORY_LABEL
    : (selectedVisitSequence?.name ?? selectedRepDetail?.username ?? "Select Representative");
  const selectedRepData =
    selectedRepDetail === undefined ? undefined : repDataById.get(selectedRepDetail.id);
  // Lets the store list and map lag behind fast typing instead of blocking the input.
  const deferredSearchText = useDeferredValue(searchText);

  const repTerritories: TRepTerritoryData[] = useMemo(
    () => shownReps.map((rep) => ({ rep, repData: repDataById.get(rep.id) })),
    [shownRepIdsKey, repDataById]
  );
  const selectedVisitSequenceOutcomesBySiteId =
    selectedVisitSequence !== undefined &&
    loadedVisitSequenceOutcomes?.visitSequenceId === selectedVisitSequence.id
      ? loadedVisitSequenceOutcomes.outcomesBySiteId
      : undefined;
  const visitSequenceInput: TVisitSequenceInput | undefined = useMemo(
    () =>
      selectedVisitSequenceOutcomesBySiteId === undefined
        ? undefined
        : { outcomesBySiteId: selectedVisitSequenceOutcomesBySiteId, showVisited },
    [selectedVisitSequenceOutcomesBySiteId, showVisited]
  );
  const territoryView = useMemo(
    () =>
      buildTerritoryView(
        repTerritories,
        {
          searchText: deferredSearchText,
          selectedDueDate,
          excludedParentCompanies,
          showStoresWithoutPendingServiceOrders,
          // The rep filter only applies to the combined territory and visit sequences
          excludedRepIds: isMultiRepView ? excludedRepIds : new Set(),
        },
        visitSequenceInput
      ),
    [
      visitSequenceInput,
      repTerritories,
      deferredSearchText,
      selectedDueDate,
      excludedParentCompanies,
      showStoresWithoutPendingServiceOrders,
      isMultiRepView,
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
  // a fresh fetch once loaded). The combined territory and visit sequences read stored schedules
  // only; a single rep honours the page URL's use_cache param.
  useEffect(() => {
    const repsToFetch = shownReps.filter((rep) => !repDataById.has(rep.id));
    if (repsToFetch.length === 0) {
      return;
    }

    const useCache = isMultiRepView
      ? "on"
      : new URLSearchParams(window.location.search).get("use_cache");
    void loadRepData(repsToFetch, useCache);
    // loadRepData/repDataById intentionally excluded - this should only re-run when the
    // selection (or the selected visit sequence's reps) changes, not on every fetch-state/cache
    // update it causes
  }, [selection, shownRepIdsKey]);

  // Fetch the selected visit sequence's outcomes every time it's selected, so other users' marks
  // show up
  useEffect(() => {
    if (selection?.kind !== "visitSequence") {
      return;
    }
    const { visitSequenceId } = selection;
    void sendJsonRequest<interfaces.QtVisitSequenceOutcomes>(
      reverse("survey_worker:qt_visit_sequence_outcomes", {
        visit_sequence_id: visitSequenceId,
      }),
      djangoContext.csrf_token
    ).then((result) => {
      if (!result.isSuccess) {
        toast.error(...result.errorMessages);
        return;
      }
      setLoadedVisitSequenceOutcomes({
        visitSequenceId,
        outcomesBySiteId: new Map(
          result.payload.outcomes.map((outcome) => [outcome.site_id, outcome])
        ),
      });
    });
  }, [selection]);

  // Restore the last selection on mount, falling back to the first rep
  useEffect(() => {
    const restoredSelection = restoreTerritorySelection(
      localStorage.getItem(LAST_SELECTED_REP_ID_KEY),
      props.rep_details.map((rep) => rep.id),
      props.visit_sequences.map((visitSequence) => visitSequence.id)
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
      toast.success(isMultiRepView ? "Schedules refreshed." : "Schedule refreshed.");
    }
  }

  /** Applies an outcome change the server confirmed, unless another sequence was selected since. */
  function updateOutcomes(
    visitSequenceId: number,
    update: (outcomesBySiteId: Map<number, TVisitSequenceOutcome>) => void
  ) {
    setLoadedVisitSequenceOutcomes((current) => {
      if (current?.visitSequenceId !== visitSequenceId) {
        return current;
      }
      const outcomesBySiteId = new Map(current.outcomesBySiteId);
      update(outcomesBySiteId);
      return { visitSequenceId, outcomesBySiteId };
    });
  }

  async function handleMarkStoreVisited(visitSequenceId: number, siteId: number) {
    const result = await sendJsonRequest<interfaces.QtVisitSequenceOutcomeDetail>(
      reverse("survey_worker:qt_mark_store_visited", { visit_sequence_id: visitSequenceId }),
      djangoContext.csrf_token,
      new URLSearchParams({ site_id: siteId.toString() })
    );
    if (!result.isSuccess) {
      toast.error(...result.errorMessages);
      return;
    }
    const { outcome } = result.payload;
    updateOutcomes(visitSequenceId, (outcomesBySiteId) =>
      outcomesBySiteId.set(outcome.site_id, outcome)
    );
  }

  async function handleSkipStore(
    visitSequenceId: number,
    siteId: number,
    reason: TSkipReason,
    note: string
  ): Promise<boolean> {
    const result = await sendJsonRequest<interfaces.QtVisitSequenceOutcomeDetail>(
      reverse("survey_worker:qt_skip_store", { visit_sequence_id: visitSequenceId }),
      djangoContext.csrf_token,
      new URLSearchParams({ site_id: siteId.toString(), reason, note })
    );
    if (!result.isSuccess) {
      toast.error(...result.errorMessages);
      return false;
    }
    const { outcome } = result.payload;
    updateOutcomes(visitSequenceId, (outcomesBySiteId) =>
      outcomesBySiteId.set(outcome.site_id, outcome)
    );
    return true;
  }

  async function handleUndoStoreOutcome(visitSequenceId: number, siteId: number) {
    const result = await sendJsonRequest<interfaces.QtVisitSequenceOutcomeUndone>(
      reverse("survey_worker:qt_undo_store_outcome", { visit_sequence_id: visitSequenceId }),
      djangoContext.csrf_token,
      new URLSearchParams({ site_id: siteId.toString() })
    );
    if (!result.isSuccess) {
      toast.error(...result.errorMessages);
      return;
    }
    updateOutcomes(visitSequenceId, (outcomesBySiteId) =>
      outcomesBySiteId.delete(result.payload.site_id)
    );
  }

  function toSiteIdsRequestBody(siteIds: number[]): URLSearchParams {
    return new URLSearchParams(siteIds.map((siteId) => ["site_ids", siteId.toString()]));
  }

  async function handleUndoStoreOutcomes(visitSequenceId: number, siteIds: number[]) {
    const result = await sendJsonRequest<interfaces.QtVisitSequenceOutcomesUndone>(
      reverse("survey_worker:qt_undo_store_outcomes", { visit_sequence_id: visitSequenceId }),
      djangoContext.csrf_token,
      toSiteIdsRequestBody(siteIds)
    );
    if (!result.isSuccess) {
      toast.error(...result.errorMessages);
      return;
    }
    const undoneSiteIds = result.payload.site_ids;
    updateOutcomes(visitSequenceId, (outcomesBySiteId) => {
      for (const siteId of undoneSiteIds) {
        outcomesBySiteId.delete(siteId);
      }
    });
    toast.success(`Undid the visits to ${undoneSiteIds.length} stores.`);
  }

  /**
   * Marks every one of the rep's remaining stores in the sequence visited (worked out before
   * filters), after a confirm. The toast's Undo reverses exactly the stores this marked.
   */
  async function handleMarkAllRepStoresVisited(
    visitSequenceId: number,
    rep: TTerritoryRep,
    remainingSiteIds: number[]
  ) {
    if (
      !window.confirm(
        `Mark all ${remainingSiteIds.length} of ${rep.username}'s remaining stores in this visit sequence visited? Skipped stores are left as they are.`
      )
    ) {
      return;
    }
    setMarkingAllVisitedRepId(rep.id);
    const result = await sendJsonRequest<interfaces.QtVisitSequenceOutcomes>(
      reverse("survey_worker:qt_mark_stores_visited", { visit_sequence_id: visitSequenceId }),
      djangoContext.csrf_token,
      toSiteIdsRequestBody(remainingSiteIds)
    );
    setMarkingAllVisitedRepId(null);
    if (!result.isSuccess) {
      toast.error(...result.errorMessages);
      return;
    }
    const markedOutcomes = result.payload.outcomes;
    updateOutcomes(visitSequenceId, (outcomesBySiteId) => {
      for (const outcome of markedOutcomes) {
        outcomesBySiteId.set(outcome.site_id, outcome);
      }
    });
    if (markedOutcomes.length === 0) {
      toast.info(`${rep.username}'s stores were already visited or skipped.`);
      return;
    }
    const markedSiteIds = markedOutcomes.map((outcome) => outcome.site_id);
    toast.successWithAction(`Marked ${markedSiteIds.length} of ${rep.username}'s stores visited.`, {
      label: "Undo",
      onClick: () => void handleUndoStoreOutcomes(visitSequenceId, markedSiteIds),
    });
  }

  const visitSequenceStoreActions: TVisitSequenceStoreActions | null =
    selectedVisitSequence !== undefined && selectedVisitSequenceOutcomesBySiteId !== undefined
      ? {
          outcomesBySiteId: selectedVisitSequenceOutcomesBySiteId,
          onMarkVisited: (siteId) => handleMarkStoreVisited(selectedVisitSequence.id, siteId),
          onSkip: (siteId, reason, note) =>
            handleSkipStore(selectedVisitSequence.id, siteId, reason, note),
          onUndo: (siteId) => handleUndoStoreOutcome(selectedVisitSequence.id, siteId),
        }
      : null;

  function openNewVisitSequenceModal() {
    setNewVisitSequenceDraft({
      initialName: getDefaultVisitSequenceName(new Date()),
      initialRepIds: getPreselectedRepIds(
        selection,
        allReps.map((rep) => rep.id)
      ),
    });
  }

  async function handleCreateVisitSequence(name: string, repIds: number[]): Promise<string[]> {
    const result = await requestSaveVisitSequence(
      reverse("survey_worker:qt_create_visit_sequence"),
      name,
      repIds,
      djangoContext.csrf_token
    );
    if (!result.isSuccess) {
      return result.errorMessages;
    }

    const { visitSequence } = result;
    setVisitSequences((current) =>
      [...current, visitSequence].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewVisitSequenceDraft(null);
    handleSelectionChange({ kind: "visitSequence", visitSequenceId: visitSequence.id });
    toast.success(`Created ${visitSequence.name}.`);
    return [];
  }

  async function handleUpdateVisitSequence(
    visitSequenceId: number,
    name: string,
    repIds: number[]
  ): Promise<string[]> {
    const result = await requestSaveVisitSequence(
      reverse("survey_worker:qt_update_visit_sequence", { visit_sequence_id: visitSequenceId }),
      name,
      repIds,
      djangoContext.csrf_token
    );
    if (!result.isSuccess) {
      return result.errorMessages;
    }

    const { visitSequence } = result;
    setVisitSequences((current) =>
      current
        .map((existing) => (existing.id === visitSequence.id ? visitSequence : existing))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditVisitSequenceDraft(null);
    toast.success(`Saved ${visitSequence.name}.`);
    return [];
  }

  /** Deletes the visit sequence after a confirm, and switches the page back to a field rep. */
  async function handleDeleteVisitSequence(visitSequence: TVisitSequence) {
    if (
      !window.confirm(`Delete ${visitSequence.name}? Its visited and skipped stores will be lost.`)
    ) {
      return;
    }

    const result = await sendJsonRequest<interfaces.QtVisitSequenceDeleted>(
      reverse("survey_worker:qt_delete_visit_sequence", { visit_sequence_id: visitSequence.id }),
      djangoContext.csrf_token,
      new URLSearchParams()
    );
    if (!result.isSuccess) {
      toast.error(...result.errorMessages);
      return;
    }

    setVisitSequences((current) => current.filter((existing) => existing.id !== visitSequence.id));
    const fallbackRep =
      allReps.find((rep) => visitSequence.rep_ids.includes(rep.id)) ?? allReps.at(0);
    if (fallbackRep !== undefined) {
      handleSelectionChange({ kind: "fieldRep", repId: fallbackRep.id });
    }
    toast.success(`Deleted ${visitSequence.name}.`);
  }

  return (
    <Layout navbar={<NavigationBar />} title="Territory Viewer">
      <div className="container mt-4">
        <h2 className="mb-4">Territory Viewer</h2>

        <div className="mb-4">
          <div className="mb-3">
            <label className="form-label fw-semibold">Field Representative:</label>
            <div className="d-flex gap-2">
              <DropdownButton id="rep-select" title={selectionLabel} variant="secondary">
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
                {visitSequences.length > 0 && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Header>Visit Sequences</Dropdown.Header>
                    {visitSequences.map((visitSequence) => (
                      <Dropdown.Item
                        key={visitSequence.id}
                        onClick={() =>
                          handleSelectionChange({
                            kind: "visitSequence",
                            visitSequenceId: visitSequence.id,
                          })
                        }
                        active={selectedVisitSequence?.id === visitSequence.id}
                      >
                        {visitSequence.name}
                      </Dropdown.Item>
                    ))}
                  </>
                )}
              </DropdownButton>
              {selectedVisitSequence !== undefined && (
                <Dropdown align="end">
                  <Dropdown.Toggle
                    id="visit-sequence-actions"
                    variant="outline-secondary"
                    aria-label="Visit sequence actions"
                  >
                    <FontAwesomeIcon icon={faEllipsis} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() =>
                        setEditVisitSequenceDraft({
                          visitSequence: selectedVisitSequence,
                          shownFields: "name",
                        })
                      }
                    >
                      Rename
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() =>
                        setEditVisitSequenceDraft({
                          visitSequence: selectedVisitSequence,
                          shownFields: "reps",
                        })
                      }
                    >
                      Edit reps
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => void handleDeleteVisitSequence(selectedVisitSequence)}
                    >
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
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
            <button
              type="button"
              className="btn btn-sm btn-outline-primary ms-auto"
              onClick={openNewVisitSequenceModal}
            >
              <FontAwesomeIcon icon={faPlus} className="me-1" />
              New Visit Sequence
            </button>
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
                {!isMultiRepView && (
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

            {territoryView.visitSequence !== null && (
              <div className="d-flex align-items-center flex-wrap gap-3 mb-2">
                <strong>
                  {territoryView.visitSequence.progress.visitedCount} visited ·{" "}
                  {territoryView.visitSequence.progress.skippedCount} skipped ·{" "}
                  {territoryView.visitSequence.progress.leftCount} left
                </strong>
                <Form.Check
                  type="switch"
                  id="show-visited"
                  label="Show visited"
                  checked={showVisited}
                  onChange={(event) => setShowVisited(event.target.checked)}
                />
              </div>
            )}

            {isMultiRepView && territoryView.repSummaries.length > 0 && (
              <Table size="sm" responsive className="mb-4">
                <thead>
                  <tr>
                    <th>Field Rep</th>
                    <th className="text-end">Stores</th>
                    <th className="text-end">Hours</th>
                    <th>Schedule last refreshed</th>
                    {territoryView.visitSequence !== null && <th></th>}
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
                      {territoryView.visitSequence !== null &&
                        selectedVisitSequence !== undefined && (
                          <td className="text-end">
                            <MarkAllVisitedButton
                              remainingSiteIds={
                                territoryView.visitSequence.remainingSiteIdsByRepId.get(
                                  repSummary.rep.id
                                ) ?? []
                              }
                              isMarking={markingAllVisitedRepId === repSummary.rep.id}
                              isDisabled={markingAllVisitedRepId !== null}
                              onMarkAll={(remainingSiteIds) =>
                                void handleMarkAllRepStoresVisited(
                                  selectedVisitSequence.id,
                                  repSummary.rep,
                                  remainingSiteIds
                                )
                              }
                            />
                          </td>
                        )}
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
                      // No home pins for the combined territory or a visit sequence
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
                      showRepNames={isMultiRepView}
                      visitSequenceActions={visitSequenceStoreActions}
                      isVisitSequenceAllDone={territoryView.visitSequence?.isAllDone ?? false}
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
              showRepNames={isMultiRepView}
              visitSequence={
                territoryView.visitSequence !== null && visitSequenceStoreActions !== null
                  ? { view: territoryView.visitSequence, actions: visitSequenceStoreActions }
                  : null
              }
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
          reps={isMultiRepView ? shownReps : null}
          excludedRepIds={excludedRepIds}
          onChangeExcludedRepIds={setExcludedRepIds}
        />

        {newVisitSequenceDraft !== null && (
          <VisitSequenceModal
            title="New Visit Sequence"
            submitLabel="Create"
            reps={allReps}
            initialName={newVisitSequenceDraft.initialName}
            initialRepIds={newVisitSequenceDraft.initialRepIds}
            onHide={() => setNewVisitSequenceDraft(null)}
            onSubmit={handleCreateVisitSequence}
          />
        )}

        {editVisitSequenceDraft !== null && (
          <VisitSequenceModal
            title={
              editVisitSequenceDraft.shownFields === "name"
                ? "Rename Visit Sequence"
                : "Edit Visit Sequence Reps"
            }
            submitLabel="Save"
            reps={allReps}
            initialName={editVisitSequenceDraft.visitSequence.name}
            initialRepIds={editVisitSequenceDraft.visitSequence.rep_ids}
            shownFields={editVisitSequenceDraft.shownFields}
            onHide={() => setEditVisitSequenceDraft(null)}
            onSubmit={(name, repIds) =>
              handleUpdateVisitSequence(editVisitSequenceDraft.visitSequence.id, name, repIds)
            }
          />
        )}
      </div>
    </Layout>
  );
}
