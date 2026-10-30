import {
  SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore,
  SurveyWorkerQtraxViewsTemplatesTVisitSequenceOutcome,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  interfaces,
} from "@reactivated";

import { TServiceOrder, isSunday, matchesSearch } from "@client/util/qtSurveyWorker/scheduleUtils";

type TRecentlySeenStore = SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore;

/** A field rep the Territory Viewer can show. */
export interface TTerritoryRep {
  id: number;
  username: string;
}

/** One field rep's territory data, or undefined while it's still loading (or failed). */
export interface TRepTerritoryData {
  rep: TTerritoryRep;
  repData: interfaces.QtTerritoryRepData | undefined;
}

/** A service order, tagged with the field rep whose schedule it's in. */
export type TTerritoryServiceOrder = TServiceOrder & { repUsername: string };

/** A recently seen store, tagged with the field rep who saw it. */
export type TTerritoryRecentlySeenStore = TRecentlySeenStore & { repUsername: string };

/** A store on the Territory Viewer, with the service orders it has in the shown reps' schedules. */
export interface TTerritoryStore {
  address: SurveyWorkerQtraxWebsiteTypedefsAddress;
  serviceOrders: TTerritoryServiceOrder[];
  /** When the store was last seen, left out when there's no store row to tell. */
  lastSeen?: string;
}

/** What the user has chosen to narrow the Territory Viewer down to. */
export interface TTerritoryFilters {
  searchText: string;
  /** A due date from the view's `dueDateOptions`, or null for "All Dates". */
  selectedDueDate: string | null;
  /**
   * Parent companies the user unticked. Recorded as exclusions so a parent company that
   * appears for the first time is shown.
   */
  excludedParentCompanies: ReadonlySet<string>;
  showStoresWithoutPendingServiceOrders: boolean;
  /** Field reps the user unticked, for the combined territory. */
  excludedRepIds: ReadonlySet<number>;
}

/** Enough to render the "Filters active" banner. Search and due date don't count. */
export interface TActiveFilterSummary {
  isAnyFilterActive: boolean;
  areStoresWithoutPendingServiceOrdersHidden: boolean;
  isParentCompanyFilterActive: boolean;
  shownParentCompanyCount: number;
  totalParentCompanyCount: number;
  isRepFilterActive: boolean;
  shownRepCount: number;
  totalRepCount: number;
}

/** One shown field rep's share of the view. */
export interface TRepSummary {
  rep: TTerritoryRep;
  totalWorkHours: number;
  /** Stores with this rep's service orders shown. */
  storeCount: number;
  scheduleLastRefreshed: string | null;
}

/** A store's visited or skipped mark in a visit sequence. */
export type TVisitSequenceOutcome = SurveyWorkerQtraxViewsTemplatesTVisitSequenceOutcome;

/** What a selected visit sequence adds to the view. */
export interface TVisitSequenceInput {
  /** The sequence's outcomes, including those of stores no longer in it. */
  outcomesBySiteId: ReadonlyMap<number, TVisitSequenceOutcome>;
  showVisited: boolean;
  /** The user's location, given while "Sort by distance" is on, to sort Remaining by. */
  location?: TLatLng;
}

/** A point on the map, in degrees. */
export interface TLatLng {
  lat: number;
  lng: number;
}

/** One store in a visit sequence's card list, of either kind. */
export type TTerritoryStoreEntry =
  | { kind: "withServiceOrders"; siteId: number; store: TTerritoryStore }
  | { kind: "recentlySeen"; siteId: number; store: TTerritoryRecentlySeenStore };

/** How far through the whole sequence the user is, whatever filters are on. */
export interface TVisitSequenceProgress {
  visitedCount: number;
  skippedCount: number;
  leftCount: number;
}

export interface TVisitSequenceView {
  /** Outcomes of the stores in the sequence. Outcomes of stores outside it are left out. */
  outcomesBySiteId: ReadonlyMap<number, TVisitSequenceOutcome>;
  /** Shown stores without an outcome, nearest first when given a location. */
  remaining: TTerritoryStoreEntry[];
  /** Shown skipped stores. Always shown, whatever "show visited" is. */
  skipped: TTerritoryStoreEntry[];
  /** Shown visited stores, or none while "show visited" is off. */
  visited: TTerritoryStoreEntry[];
  /**
   * Shown recently seen stores without a site id. Outcomes are keyed by site id, so these can't
   * be marked: they're pinned and listed like in the combined territory, but count as neither
   * left nor done, so they never hold up "all done".
   */
  unmarkableStores: TTerritoryRecentlySeenStore[];
  /**
   * Each of the sequence's reps' stores without an outcome, by site id (ascending), whatever
   * filters are on. A store in two reps' territories is listed for both.
   */
  remainingSiteIdsByRepId: ReadonlyMap<number, number[]>;
  progress: TVisitSequenceProgress;
  /** Every store in the sequence is visited or skipped. */
  isAllDone: boolean;
}

/** Everything the Territory Viewer shows for the given field reps under the current filters. */
export interface TTerritoryView {
  /**
   * Stores with service orders after all filters, keyed by site id. In a visit sequence,
   * visited stores are left out while "show visited" is off (skipped stores stay).
   */
  stores: Record<number, TTerritoryStore>;
  /**
   * Recently seen stores with no service orders shown, after search and the toggle. In a visit
   * sequence, one per site id, and visited ones are left out while "show visited" is off.
   */
  recentlySeenStores: TTerritoryRecentlySeenStore[];
  totalWorkHours: number;
  /** One per shown rep (not excluded, data loaded), in the order the reps were given. */
  repSummaries: TRepSummary[];
  /** Weekend due dates across all of the reps' service orders, deduped and earliest first. */
  dueDateOptions: string[];
  /** The due date the view was cut at, or null for "All Dates". */
  selectedDueDate: string | null;
  /** Every parent company in the reps' schedules, sorted. */
  parentCompanies: string[];
  activeFilterSummary: TActiveFilterSummary;
  /** Only for a visit sequence (given a visit-sequence input). */
  visitSequence: TVisitSequenceView | null;
}

const SATURDAY_DAY_OF_WEEK = 6;

function isWeekend(date: Date): boolean {
  return isSunday(date) || date.getDay() === SATURDAY_DAY_OF_WEEK;
}

function sumEstimatedTime(serviceOrders: TServiceOrder[]): number {
  return serviceOrders.reduce((total, serviceOrder) => total + serviceOrder.EstimatedTime, 0);
}

/** The store's service orders' estimated time added up, in hours. */
export function getStoreEstimatedTime(store: TTerritoryStore): number {
  return sumEstimatedTime(store.serviceOrders);
}

function getDueDateOptions(serviceOrders: TServiceOrder[]): string[] {
  const weekendDueDates = serviceOrders
    .map((serviceOrder) => serviceOrder.DateScheduleRangeEndOriginal)
    .filter((dueDate) => dueDate !== "" && isWeekend(new Date(dueDate)))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return [...new Set(weekendDueDates)];
}

function groupBySiteId(
  serviceOrders: TTerritoryServiceOrder[],
  lastSeenBySiteId: ReadonlyMap<number, string>
): Record<number, TTerritoryStore> {
  const storesBySiteId: Record<number, TTerritoryStore> = {};
  for (const serviceOrder of serviceOrders) {
    const siteId = serviceOrder.Address.SiteId;
    if (!(siteId in storesBySiteId)) {
      const lastSeen = lastSeenBySiteId.get(siteId);
      storesBySiteId[siteId] = {
        address: serviceOrder.Address,
        serviceOrders: [],
        ...(lastSeen !== undefined && { lastSeen }),
      };
    }
    storesBySiteId[siteId].serviceOrders.push(serviceOrder);
  }
  return storesBySiteId;
}

function getStoreSearchKey({ address, serviceOrders }: TTerritoryStore): string {
  const serviceOrderDescriptions = serviceOrders
    .map((serviceOrder) => serviceOrder.ServiceOrderDescription || "")
    .join(" ");
  return `${address.City}, ${address.State} | ${address.StreetAddress} | ${address.StoreName} ${serviceOrderDescriptions}`;
}

function getRecentlySeenStoreSearchKey(store: TRecentlySeenStore): string {
  return `${store.city}, ${store.state} | ${store.address_1} | ${store.name}`;
}

/**
 * Keeps the store's service orders due on or before `dueDate`, or returns null if none are
 * left. A service order without a due date is kept but doesn't keep its store shown alone.
 */
function cutAtDueDate(store: TTerritoryStore, dueDate: string): TTerritoryStore | null {
  const serviceOrdersDueByDate = store.serviceOrders.filter(
    (serviceOrder) =>
      serviceOrder.DateScheduleRangeEndOriginal === "" ||
      new Date(serviceOrder.DateScheduleRangeEndOriginal) <= new Date(dueDate)
  );
  const hasDatedServiceOrder = serviceOrdersDueByDate.some(
    (serviceOrder) => serviceOrder.DateScheduleRangeEndOriginal !== ""
  );
  return hasDatedServiceOrder ? { ...store, serviceOrders: serviceOrdersDueByDate } : null;
}

/** Every site id in the rep's territory, before any filter. */
function getRepMemberSiteIds({ repData }: TRepTerritoryData): Set<number> {
  const memberSiteIds = new Set<number>();
  for (const serviceOrder of repData?.schedule?.ServiceOrders ?? []) {
    memberSiteIds.add(serviceOrder.Address.SiteId);
  }
  for (const store of repData?.recently_seen_stores ?? []) {
    if (store.site_id !== null) {
      memberSiteIds.add(store.site_id);
    }
  }
  return memberSiteIds;
}

/**
 * The shown stores as card-list entries, one per site id. Recently seen stores without a site id
 * are left out (see TVisitSequenceView.unmarkableStores).
 */
function toStoreEntries(
  stores: Record<number, TTerritoryStore>,
  recentlySeenStores: TTerritoryRecentlySeenStore[]
): TTerritoryStoreEntry[] {
  const storeEntries: TTerritoryStoreEntry[] = Object.values(stores).map((store) => ({
    kind: "withServiceOrders",
    siteId: store.address.SiteId,
    store,
  }));
  const seenSiteIds = new Set(storeEntries.map((storeEntry) => storeEntry.siteId));
  for (const store of recentlySeenStores) {
    if (store.site_id === null || seenSiteIds.has(store.site_id)) {
      continue;
    }
    seenSiteIds.add(store.site_id);
    storeEntries.push({ kind: "recentlySeen", siteId: store.site_id, store });
  }
  return storeEntries;
}

/** Where the map pins the store, or null if it can't. */
function getStoreEntryLatLng(storeEntry: TTerritoryStoreEntry): TLatLng | null {
  if (storeEntry.kind === "withServiceOrders") {
    return { lat: storeEntry.store.address.Latitude, lng: storeEntry.store.address.Longitude };
  }
  const { latitude, longitude } = storeEntry.store;
  return latitude === null || longitude === null ? null : { lat: latitude, lng: longitude };
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** The straight-line (great-circle) distance between two points, in kilometres. */
function getDistanceKm(from: TLatLng, to: TLatLng): number {
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

/** The store entries nearest `location` first. Stores the map can't pin go last, in order. */
function sortByDistance(
  storeEntries: TTerritoryStoreEntry[],
  location: TLatLng
): TTerritoryStoreEntry[] {
  return (
    storeEntries
      .map((storeEntry) => {
        const storeLatLng = getStoreEntryLatLng(storeEntry);
        const distanceKm = storeLatLng === null ? Infinity : getDistanceKm(location, storeLatLng);
        return { storeEntry, distanceKm };
      })
      // Infinity - Infinity is NaN, so two unpinned stores compare equal and keep their order
      .sort((a, b) => a.distanceKm - b.distanceKm || 0)
      .map(({ storeEntry }) => storeEntry)
  );
}

/**
 * The stores a visit sequence pins on the map: its Remaining, Skipped and Visited groups, plus the
 * stores it can't mark.
 */
function getMapStores(
  shownStoreEntries: TTerritoryStoreEntry[],
  visitSequence: TVisitSequenceView
): Pick<TTerritoryView, "stores" | "recentlySeenStores"> {
  const mapStores: Record<number, TTerritoryStore> = {};
  const mapRecentlySeenStores: TTerritoryRecentlySeenStore[] = [];
  const pinnedSiteIds = new Set(
    [...visitSequence.remaining, ...visitSequence.skipped, ...visitSequence.visited].map(
      (storeEntry) => storeEntry.siteId
    )
  );
  for (const storeEntry of shownStoreEntries) {
    if (!pinnedSiteIds.has(storeEntry.siteId)) {
      continue;
    }
    if (storeEntry.kind === "withServiceOrders") {
      mapStores[storeEntry.siteId] = storeEntry.store;
    } else {
      mapRecentlySeenStores.push(storeEntry.store);
    }
  }
  mapRecentlySeenStores.push(...visitSequence.unmarkableStores);
  return { stores: mapStores, recentlySeenStores: mapRecentlySeenStores };
}

function buildVisitSequenceView(
  repTerritories: TRepTerritoryData[],
  shownStoreEntries: TTerritoryStoreEntry[],
  shownRecentlySeenStores: TTerritoryRecentlySeenStore[],
  visitSequenceInput: TVisitSequenceInput
): TVisitSequenceView {
  const memberSiteIdsByRepId = new Map(
    repTerritories.map((repTerritory) => [repTerritory.rep.id, getRepMemberSiteIds(repTerritory)])
  );
  const memberSiteIds = new Set(
    [...memberSiteIdsByRepId.values()].flatMap((repMemberSiteIds) => [...repMemberSiteIds])
  );
  const outcomesBySiteId = new Map(
    [...visitSequenceInput.outcomesBySiteId].filter(([siteId]) => memberSiteIds.has(siteId))
  );
  const outcomeKinds = [...outcomesBySiteId.values()].map((outcome) => outcome.kind);
  const visitedCount = outcomeKinds.filter((kind) => kind === "visited").length;
  const skippedCount = outcomeKinds.filter((kind) => kind === "skipped").length;
  const leftCount = memberSiteIds.size - visitedCount - skippedCount;
  const hasOutcomeKind = (storeEntry: TTerritoryStoreEntry, kind: TVisitSequenceOutcome["kind"]) =>
    outcomesBySiteId.get(storeEntry.siteId)?.kind === kind;

  const remaining = shownStoreEntries.filter(
    (storeEntry) => !outcomesBySiteId.has(storeEntry.siteId)
  );

  return {
    outcomesBySiteId,
    remaining:
      visitSequenceInput.location === undefined
        ? remaining
        : sortByDistance(remaining, visitSequenceInput.location),
    skipped: shownStoreEntries.filter((storeEntry) => hasOutcomeKind(storeEntry, "skipped")),
    visited: visitSequenceInput.showVisited
      ? shownStoreEntries.filter((storeEntry) => hasOutcomeKind(storeEntry, "visited"))
      : [],
    unmarkableStores: shownRecentlySeenStores.filter((store) => store.site_id === null),
    remainingSiteIdsByRepId: new Map(
      [...memberSiteIdsByRepId].map(([repId, repMemberSiteIds]) => [
        repId,
        [...repMemberSiteIds]
          .filter((siteId) => !outcomesBySiteId.has(siteId))
          .sort((a, b) => a - b),
      ])
    ),
    progress: { visitedCount, skippedCount, leftCount },
    isAllDone: memberSiteIds.size > 0 && leftCount === 0,
  };
}

/**
 * Works out what the Territory Viewer shows for the given field reps' territory data under the
 * given filters: one rep for a single territory, every rep for the combined territory. A rep
 * whose data is missing (still loading, or failed) contributes nothing.
 *
 * Given a visit-sequence input, the reps are a visit sequence's, and the view also works out
 * each store's outcome, the Remaining/Skipped/Visited split and the sequence's progress.
 */
export function buildTerritoryView(
  repTerritories: TRepTerritoryData[],
  filters: TTerritoryFilters,
  visitSequenceInput?: TVisitSequenceInput
): TTerritoryView {
  const shownRepTerritories = repTerritories.filter(
    ({ rep }) => !filters.excludedRepIds.has(rep.id)
  );
  const allServiceOrders: TTerritoryServiceOrder[] = repTerritories.flatMap(({ rep, repData }) =>
    (repData?.schedule?.ServiceOrders ?? []).map((serviceOrder) => ({
      ...serviceOrder,
      repUsername: rep.username,
    }))
  );
  const dueDateOptions = getDueDateOptions(allServiceOrders);
  const parentCompanies = Array.from(
    new Set(allServiceOrders.map((serviceOrder) => serviceOrder.JobClient))
  ).sort();

  // Every rep's Last Seen of a store comes from the same store row, so any rep's will do
  const lastSeenBySiteId = new Map(
    repTerritories.flatMap(({ repData }) =>
      Object.entries(repData?.last_seen_by_site_id ?? {}).map(
        ([siteId, lastSeen]) => [Number(siteId), lastSeen] as const
      )
    )
  );
  const shownRepUsernames = new Set(shownRepTerritories.map(({ rep }) => rep.username));
  const storesOfShownParentCompanies = groupBySiteId(
    allServiceOrders.filter(
      (serviceOrder) =>
        shownRepUsernames.has(serviceOrder.repUsername) &&
        !filters.excludedParentCompanies.has(serviceOrder.JobClient)
    ),
    lastSeenBySiteId
  );

  // A date that isn't among the reps' options (e.g. one picked for another rep) is treated as
  // "All Dates".
  const selectedDueDate =
    filters.selectedDueDate !== null && dueDateOptions.includes(filters.selectedDueDate)
      ? filters.selectedDueDate
      : null;

  const stores: Record<number, TTerritoryStore> = {};
  for (const [siteId, store] of Object.entries(storesOfShownParentCompanies)) {
    if (!matchesSearch(getStoreSearchKey(store), filters.searchText)) {
      continue;
    }
    const shownStore = selectedDueDate === null ? store : cutAtDueDate(store, selectedDueDate);
    if (shownStore !== null) {
      stores[Number(siteId)] = shownStore;
    }
  }

  // Deduped against stores that have service orders after the rep and parent-company filters
  // (not after search or the due-date cut), so a store never gets both a green and a red pin.
  // The due-date cut doesn't apply, since recently seen stores have no service orders to cut.
  const recentlySeenStores: TTerritoryRecentlySeenStore[] =
    filters.showStoresWithoutPendingServiceOrders
      ? shownRepTerritories
          .flatMap(({ rep, repData }) =>
            (repData?.recently_seen_stores ?? []).map((store) => ({
              ...store,
              repUsername: rep.username,
            }))
          )
          .filter(
            (store) =>
              (store.site_id === null || !(store.site_id in storesOfShownParentCompanies)) &&
              matchesSearch(getRecentlySeenStoreSearchKey(store), filters.searchText)
          )
      : [];

  const shownServiceOrders = Object.values(stores).flatMap((store) => store.serviceOrders);
  const totalWorkHours = sumEstimatedTime(shownServiceOrders);

  const repSummaries: TRepSummary[] = shownRepTerritories
    .filter(({ repData }) => repData !== undefined)
    .map(({ rep, repData }) => {
      const repServiceOrders = shownServiceOrders.filter(
        (serviceOrder) => serviceOrder.repUsername === rep.username
      );
      return {
        rep,
        totalWorkHours: sumEstimatedTime(repServiceOrders),
        storeCount: new Set(repServiceOrders.map((serviceOrder) => serviceOrder.Address.SiteId))
          .size,
        scheduleLastRefreshed: repData?.rep_sync_data.schedule_last_refreshed ?? null,
      };
    });

  const shownParentCompanyCount = parentCompanies.filter(
    (parentCompany) => !filters.excludedParentCompanies.has(parentCompany)
  ).length;
  const isParentCompanyFilterActive = shownParentCompanyCount < parentCompanies.length;
  const areStoresWithoutPendingServiceOrdersHidden = !filters.showStoresWithoutPendingServiceOrders;
  const isRepFilterActive = shownRepTerritories.length < repTerritories.length;

  const shownStoreEntries =
    visitSequenceInput === undefined ? [] : toStoreEntries(stores, recentlySeenStores);
  const visitSequence =
    visitSequenceInput === undefined
      ? null
      : buildVisitSequenceView(
          repTerritories,
          shownStoreEntries,
          recentlySeenStores,
          visitSequenceInput
        );

  return {
    ...(visitSequence === null
      ? { stores, recentlySeenStores }
      : getMapStores(shownStoreEntries, visitSequence)),
    totalWorkHours,
    repSummaries,
    dueDateOptions,
    selectedDueDate,
    parentCompanies,
    activeFilterSummary: {
      isAnyFilterActive:
        areStoresWithoutPendingServiceOrdersHidden ||
        isParentCompanyFilterActive ||
        isRepFilterActive,
      areStoresWithoutPendingServiceOrdersHidden,
      isParentCompanyFilterActive,
      shownParentCompanyCount,
      totalParentCompanyCount: parentCompanies.length,
      isRepFilterActive,
      shownRepCount: shownRepTerritories.length,
      totalRepCount: repTerritories.length,
    },
    visitSequence,
  };
}
