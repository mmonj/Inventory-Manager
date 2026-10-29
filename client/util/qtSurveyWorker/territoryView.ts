import {
  SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore,
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

/** Everything the Territory Viewer shows for the given field reps under the current filters. */
export interface TTerritoryView {
  /** Stores with service orders after all filters, keyed by site id. */
  stores: Record<number, TTerritoryStore>;
  /** Recently seen stores with no service orders shown, after search and the toggle. */
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

function groupBySiteId(serviceOrders: TTerritoryServiceOrder[]): Record<number, TTerritoryStore> {
  const storesBySiteId: Record<number, TTerritoryStore> = {};
  for (const serviceOrder of serviceOrders) {
    const siteId = serviceOrder.Address.SiteId;
    if (!(siteId in storesBySiteId)) {
      storesBySiteId[siteId] = { address: serviceOrder.Address, serviceOrders: [] };
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

/**
 * Works out what the Territory Viewer shows for the given field reps' territory data under the
 * given filters: one rep for a single territory, every rep for the combined territory. A rep
 * whose data is missing (still loading, or failed) contributes nothing.
 */
export function buildTerritoryView(
  repTerritories: TRepTerritoryData[],
  filters: TTerritoryFilters
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

  const shownRepUsernames = new Set(shownRepTerritories.map(({ rep }) => rep.username));
  const storesOfShownParentCompanies = groupBySiteId(
    allServiceOrders.filter(
      (serviceOrder) =>
        shownRepUsernames.has(serviceOrder.repUsername) &&
        !filters.excludedParentCompanies.has(serviceOrder.JobClient)
    )
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

  return {
    stores,
    recentlySeenStores,
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
  };
}
