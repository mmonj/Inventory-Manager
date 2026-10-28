import {
  SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  interfaces,
} from "@reactivated";

import { matchesSearch } from "@client/util/qtSurveyWorker/scheduleUtils";

type TServiceOrder = SurveyWorkerQtraxWebsiteTypedefsTServiceOrder;
type TRecentlySeenStore = SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore;

/** A store on the Territory Viewer, with the service orders it has in the rep's schedule. */
export interface TTerritoryStore {
  address: SurveyWorkerQtraxWebsiteTypedefsAddress;
  serviceOrders: TServiceOrder[];
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
}

/** Enough to render the "Filters active" banner. Search and due date don't count. */
export interface TActiveFilterSummary {
  isAnyFilterActive: boolean;
  areStoresWithoutPendingServiceOrdersHidden: boolean;
  isParentCompanyFilterActive: boolean;
  shownParentCompanyCount: number;
  totalParentCompanyCount: number;
}

/** Everything the Territory Viewer shows for one field rep under the current filters. */
export interface TTerritoryView {
  /** Stores with service orders after all filters, keyed by site id. */
  stores: Record<number, TTerritoryStore>;
  /** Recently seen stores with no service orders shown, after search and the toggle. */
  recentlySeenStores: TRecentlySeenStore[];
  totalWorkHours: number;
  /** Weekend due dates across all of the rep's service orders, deduped and earliest first. */
  dueDateOptions: string[];
  /** The due date the view was cut at, or null for "All Dates". */
  selectedDueDate: string | null;
  /** Every parent company in the rep's schedule, sorted. */
  parentCompanies: string[];
  activeFilterSummary: TActiveFilterSummary;
}

const SUNDAY_DAY_OF_WEEK = 0;
const SATURDAY_DAY_OF_WEEK = 6;

function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === SUNDAY_DAY_OF_WEEK || dayOfWeek === SATURDAY_DAY_OF_WEEK;
}

function getDueDateOptions(serviceOrders: TServiceOrder[]): string[] {
  const weekendDueDates = serviceOrders
    .map((serviceOrder) => serviceOrder.DateScheduleRangeEndOriginal)
    .filter((dueDate) => dueDate !== "" && isWeekend(new Date(dueDate)))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return [...new Set(weekendDueDates)];
}

function groupByStore(serviceOrders: TServiceOrder[]): Record<number, TTerritoryStore> {
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
 * Works out what the Territory Viewer shows for a field rep's territory data under the given
 * filters. Missing rep data (still loading, or failed) gives an empty view.
 */
export function buildTerritoryView(
  repData: interfaces.QtTerritoryRepData | undefined,
  filters: TTerritoryFilters
): TTerritoryView {
  const allServiceOrders = repData?.schedule?.ServiceOrders ?? [];
  const dueDateOptions = getDueDateOptions(allServiceOrders);
  const parentCompanies = Array.from(
    new Set(allServiceOrders.map((serviceOrder) => serviceOrder.JobClient))
  ).sort();

  const storesOfShownParentCompanies = groupByStore(
    allServiceOrders.filter(
      (serviceOrder) => !filters.excludedParentCompanies.has(serviceOrder.JobClient)
    )
  );

  // A date that isn't among this rep's options (e.g. one picked for another rep) is treated as
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

  // Deduped against stores that have service orders after the parent-company filter (not after
  // search or the due-date cut), so a store never gets both a green and a red pin. The due-date
  // cut doesn't apply, since recently seen stores have no service orders to cut.
  const recentlySeenStores = filters.showStoresWithoutPendingServiceOrders
    ? (repData?.recently_seen_stores ?? []).filter(
        (store) =>
          (store.site_id === null || !(store.site_id in storesOfShownParentCompanies)) &&
          matchesSearch(getRecentlySeenStoreSearchKey(store), filters.searchText)
      )
    : [];

  const totalWorkHours = Object.values(stores)
    .flatMap((store) => store.serviceOrders)
    .reduce((total, serviceOrder) => total + serviceOrder.EstimatedTime, 0);

  const shownParentCompanyCount = parentCompanies.filter(
    (parentCompany) => !filters.excludedParentCompanies.has(parentCompany)
  ).length;
  const isParentCompanyFilterActive = shownParentCompanyCount < parentCompanies.length;
  const areStoresWithoutPendingServiceOrdersHidden = !filters.showStoresWithoutPendingServiceOrders;

  return {
    stores,
    recentlySeenStores,
    totalWorkHours,
    dueDateOptions,
    selectedDueDate,
    parentCompanies,
    activeFilterSummary: {
      isAnyFilterActive: areStoresWithoutPendingServiceOrdersHidden || isParentCompanyFilterActive,
      areStoresWithoutPendingServiceOrdersHidden,
      isParentCompanyFilterActive,
      shownParentCompanyCount,
      totalParentCompanyCount: parentCompanies.length,
    },
  };
}
