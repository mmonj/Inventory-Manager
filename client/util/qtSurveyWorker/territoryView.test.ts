import { describe, expect, it } from "vitest";

import {
  SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  interfaces,
} from "@reactivated";

import { TTerritoryFilters, buildTerritoryView } from "@client/util/qtSurveyWorker/territoryView";

// 2026-10-31 is a Saturday, 2026-11-01 a Sunday, 2026-11-02 a Monday.
const SATURDAY = "2026-10-31T00:00:00";
const SUNDAY = "2026-11-01T00:00:00";
const MONDAY = "2026-11-02T00:00:00";
const NEXT_SATURDAY = "2026-11-07T00:00:00";

function makeAddress(
  overrides: Partial<SurveyWorkerQtraxWebsiteTypedefsAddress> & { SiteId: number }
): SurveyWorkerQtraxWebsiteTypedefsAddress {
  return {
    StoreName: `Store ${overrides.SiteId}`,
    StoreNumber: `${overrides.SiteId}`,
    StreetAddress: `${overrides.SiteId} Main St`,
    City: "Springfield",
    State: "IL",
    PostalCode: "62701",
    Latitude: 39.8,
    Longitude: -89.6,
    Phone: null,
    IsPhysicalVisit: true,
    IncludeInMileage: true,
    MapLink: "",
    StoreNumberSortable: `${overrides.SiteId}`,
    IsAtPrsHQ: false,
    IsDone: null,
    ...overrides,
  };
}

let nextServiceOrderId = 1;

function makeServiceOrder(options: {
  address: SurveyWorkerQtraxWebsiteTypedefsAddress;
  parentCompany?: string;
  description?: string;
  dueDate?: string;
  estimatedTime?: number;
}): SurveyWorkerQtraxWebsiteTypedefsTServiceOrder {
  const dueDate = options.dueDate ?? SATURDAY;
  return {
    JobId: 1,
    ServiceOrderDescription: options.description ?? "Reset aisle",
    NoVisitNecessary: false,
    DateScheduleRangeStart: "2026-10-26T00:00:00",
    DateScheduleRangeEnd: dueDate,
    DateScheduled: "",
    EstimatedTime: options.estimatedTime ?? 1,
    RepId: 1,
    RequiresTimeScheduling: false,
    NeedsTeamLeaderWarning: false,
    WaitForTeamLeaderToSchedule: false,
    TimeRemaingThisWeek: 0,
    Distance: 0,
    CanPrintInstructions: false,
    IsPastDue: false,
    DateScheduleRangeStartOriginal: "2026-10-26T00:00:00",
    DateScheduleRangeEndOriginal: dueDate,
    TimeSchedulingRequired: false,
    TSDE: false,
    CanUnschedule: true,
    CheckInDate: null,
    JobClient: options.parentCompany ?? "Acme",
    IsTLTM: false,
    TeamLeader: null,
    TeamMembers: null,
    VoltCheckInRequired: false,
    Priority: 0,
    RepUnassignable: false,
    Address: options.address,
    ServiceOrderId: nextServiceOrderId++,
  };
}

function makeRecentlySeenStore(
  overrides: Partial<SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore> & { id: number }
): SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore {
  return {
    site_id: null,
    name: `Seen store ${overrides.id}`,
    address_1: `${overrides.id} Elm St`,
    city: "Shelbyville",
    state: "IL",
    zip_code: "62565",
    latitude: null,
    longitude: null,
    last_seen: null,
    ...overrides,
  };
}

function makeRepData(options: {
  serviceOrders?: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
  recentlySeenStores?: SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore[];
}): interfaces.QtTerritoryRepData {
  return {
    rep_sync_data: { id: 1, schedule_last_refreshed: null },
    schedule: {
      ServiceOrders: options.serviceOrders ?? [],
    } as unknown as interfaces.QtTerritoryRepData["schedule"],
    recently_seen_stores: options.recentlySeenStores ?? [],
    is_cached: false,
    sync_error: null,
  };
}

const NO_FILTERS: TTerritoryFilters = {
  searchText: "",
  selectedDueDate: null,
  excludedParentCompanies: new Set(),
  showStoresWithoutPendingServiceOrders: true,
};

describe("buildTerritoryView", () => {
  it("returns an empty view while the rep's data is missing", () => {
    const view = buildTerritoryView(undefined, NO_FILTERS);

    expect(view.stores).toEqual({});
    expect(view.recentlySeenStores).toEqual([]);
    expect(view.totalWorkHours).toBe(0);
    expect(view.dueDateOptions).toEqual([]);
    expect(view.parentCompanies).toEqual([]);
    expect(view.activeFilterSummary.isAnyFilterActive).toBe(false);
  });

  it("groups service orders by store", () => {
    const firstStore = makeAddress({ SiteId: 10 });
    const secondStore = makeAddress({ SiteId: 20 });
    const firstOrder = makeServiceOrder({ address: firstStore });
    const secondOrder = makeServiceOrder({ address: secondStore });
    const thirdOrder = makeServiceOrder({ address: firstStore });

    const view = buildTerritoryView(
      makeRepData({ serviceOrders: [firstOrder, secondOrder, thirdOrder] }),
      NO_FILTERS
    );

    expect(view.stores).toEqual({
      10: { address: firstStore, serviceOrders: [firstOrder, thirdOrder] },
      20: { address: secondStore, serviceOrders: [secondOrder] },
    });
  });

  describe("parent-company filter", () => {
    const store = makeAddress({ SiteId: 10 });
    const acmeOrder = makeServiceOrder({ address: store, parentCompany: "Acme" });
    const globexOrder = makeServiceOrder({ address: store, parentCompany: "Globex" });
    const initechOrder = makeServiceOrder({
      address: makeAddress({ SiteId: 20 }),
      parentCompany: "Initech",
    });
    const repData = makeRepData({ serviceOrders: [initechOrder, globexOrder, acmeOrder] });

    it("lists every parent company in the schedule, sorted", () => {
      const view = buildTerritoryView(repData, {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Globex"]),
      });

      expect(view.parentCompanies).toEqual(["Acme", "Globex", "Initech"]);
    });

    it("drops service orders of excluded parent companies and stores left with none", () => {
      const view = buildTerritoryView(repData, {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Globex", "Initech"]),
      });

      expect(view.stores).toEqual({ 10: { address: store, serviceOrders: [acmeOrder] } });
    });

    it("shows a parent company that wasn't around when the exclusions were made", () => {
      // The user excluded Globex while viewing a rep that never had Acme.
      const view = buildTerritoryView(repData, {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Globex", "Hooli"]),
      });

      expect(view.stores[10].serviceOrders).toEqual([acmeOrder]);
      expect(view.stores[20].serviceOrders).toEqual([initechOrder]);
    });
  });

  describe("recently seen stores", () => {
    const storeWithOrders = makeAddress({ SiteId: 10 });
    const acmeOrder = makeServiceOrder({ address: storeWithOrders, parentCompany: "Acme" });
    const seenStoreWithOrders = makeRecentlySeenStore({ id: 1, site_id: 10 });
    const seenStoreWithoutSiteId = makeRecentlySeenStore({ id: 2, site_id: null });
    const seenStoreWithoutOrders = makeRecentlySeenStore({ id: 3, site_id: 30 });
    const repData = makeRepData({
      serviceOrders: [acmeOrder],
      recentlySeenStores: [seenStoreWithOrders, seenStoreWithoutSiteId, seenStoreWithoutOrders],
    });

    it("leaves out stores that still have service orders", () => {
      const view = buildTerritoryView(repData, NO_FILTERS);

      expect(view.recentlySeenStores).toEqual([seenStoreWithoutSiteId, seenStoreWithoutOrders]);
    });

    it("includes a store once the parent-company filter removes all its service orders", () => {
      const view = buildTerritoryView(repData, {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Acme"]),
      });

      expect(view.recentlySeenStores).toEqual([
        seenStoreWithOrders,
        seenStoreWithoutSiteId,
        seenStoreWithoutOrders,
      ]);
    });

    it("are hidden when stores without pending service orders are hidden", () => {
      const view = buildTerritoryView(repData, {
        ...NO_FILTERS,
        showStoresWithoutPendingServiceOrders: false,
      });

      expect(view.recentlySeenStores).toEqual([]);
      expect(Object.keys(view.stores)).toEqual(["10"]);
    });
  });

  describe("search", () => {
    const walmart = makeAddress({
      SiteId: 10,
      StoreName: "Walmart",
      City: "Springfield",
      State: "IL",
      StreetAddress: "1 Oak Ave",
    });
    const target = makeAddress({
      SiteId: 20,
      StoreName: "Target",
      City: "Peoria",
      State: "AZ",
      StreetAddress: "9 Pine Rd",
    });
    const walmartOrder = makeServiceOrder({ address: walmart, description: "Greeting card reset" });
    const targetOrder = makeServiceOrder({ address: target, description: "Battery audit" });
    const seenKroger = makeRecentlySeenStore({
      id: 1,
      site_id: 30,
      name: "Kroger",
      address_1: "5 Birch Ln",
      city: "Decatur",
      state: "IL",
    });
    const seenTarget = makeRecentlySeenStore({ id: 2, site_id: 20, name: "Target" });
    const seenAldi = makeRecentlySeenStore({ id: 3, site_id: 40, name: "Aldi" });
    const repData = makeRepData({
      serviceOrders: [walmartOrder, targetOrder],
      recentlySeenStores: [seenKroger, seenTarget, seenAldi],
    });

    function searchStoreIds(searchText: string): string[] {
      return Object.keys(buildTerritoryView(repData, { ...NO_FILTERS, searchText }).stores);
    }

    it.each([
      ["store name", "walmart", ["10"]],
      ["city", "peoria", ["20"]],
      ["state", "az", ["20"]],
      ["street address", "oak ave", ["10"]],
      ["service order description", "battery", ["20"]],
      ["several words in any order", "reset springfield", ["10"]],
    ])("matches stores with service orders by %s", (_field, searchText, expectedStoreIds) => {
      expect(searchStoreIds(searchText)).toEqual(expectedStoreIds);
    });

    it("matches recently seen stores by name and address", () => {
      expect(
        buildTerritoryView(repData, { ...NO_FILTERS, searchText: "kroger" }).recentlySeenStores
      ).toEqual([seenKroger]);
      expect(
        buildTerritoryView(repData, { ...NO_FILTERS, searchText: "birch decatur" })
          .recentlySeenStores
      ).toEqual([seenKroger]);
    });

    it("doesn't turn a store with service orders into a recently seen one when search hides it", () => {
      const view = buildTerritoryView(repData, { ...NO_FILTERS, searchText: "target" });

      expect(Object.keys(view.stores)).toEqual(["20"]);
      expect(view.recentlySeenStores).toEqual([]);
    });
  });

  describe("due-date options", () => {
    const store = makeAddress({ SiteId: 10, StoreName: "Walmart" });
    const repData = makeRepData({
      serviceOrders: [
        makeServiceOrder({ address: store, dueDate: NEXT_SATURDAY, parentCompany: "Acme" }),
        makeServiceOrder({ address: store, dueDate: MONDAY, parentCompany: "Acme" }),
        makeServiceOrder({ address: store, dueDate: SUNDAY, parentCompany: "Globex" }),
        makeServiceOrder({ address: store, dueDate: SATURDAY, parentCompany: "Acme" }),
        makeServiceOrder({ address: store, dueDate: NEXT_SATURDAY, parentCompany: "Globex" }),
      ],
    });

    it("lists weekend due dates once each, earliest first", () => {
      const view = buildTerritoryView(repData, NO_FILTERS);

      expect(view.dueDateOptions).toEqual([SATURDAY, SUNDAY, NEXT_SATURDAY]);
    });

    it("aren't changed by the other filters", () => {
      const view = buildTerritoryView(repData, {
        searchText: "nothing matches this",
        selectedDueDate: SATURDAY,
        excludedParentCompanies: new Set(["Globex"]),
        showStoresWithoutPendingServiceOrders: false,
      });

      expect(view.dueDateOptions).toEqual([SATURDAY, SUNDAY, NEXT_SATURDAY]);
    });
  });

  describe("due-date cut", () => {
    const mixedStore = makeAddress({ SiteId: 10 });
    const laterStore = makeAddress({ SiteId: 20 });
    const dueSaturday = makeServiceOrder({ address: mixedStore, dueDate: SATURDAY });
    const dueSunday = makeServiceOrder({ address: mixedStore, dueDate: SUNDAY });
    const dueNextSaturday = makeServiceOrder({ address: mixedStore, dueDate: NEXT_SATURDAY });
    const laterOrder = makeServiceOrder({ address: laterStore, dueDate: NEXT_SATURDAY });
    const seenStore = makeRecentlySeenStore({ id: 1, site_id: 30 });
    const repData = makeRepData({
      serviceOrders: [dueSaturday, dueSunday, dueNextSaturday, laterOrder],
      recentlySeenStores: [seenStore],
    });

    it("keeps only service orders due on or before the selected date", () => {
      const view = buildTerritoryView(repData, { ...NO_FILTERS, selectedDueDate: SUNDAY });

      expect(view.stores[10].serviceOrders).toEqual([dueSaturday, dueSunday]);
      expect(view.selectedDueDate).toBe(SUNDAY);
    });

    it("drops stores with no service orders left", () => {
      const view = buildTerritoryView(repData, { ...NO_FILTERS, selectedDueDate: SUNDAY });

      expect(Object.keys(view.stores)).toEqual(["10"]);
    });

    it("doesn't touch recently seen stores", () => {
      const view = buildTerritoryView(repData, { ...NO_FILTERS, selectedDueDate: SATURDAY });

      expect(view.recentlySeenStores).toEqual([seenStore]);
    });

    it("is ignored when the selected date isn't one of the rep's due-date options", () => {
      // e.g. a date picked for another rep, or a weekday
      for (const staleDueDate of ["2026-10-24T00:00:00", MONDAY]) {
        const view = buildTerritoryView(repData, { ...NO_FILTERS, selectedDueDate: staleDueDate });

        expect(view.stores).toEqual({
          10: { address: mixedStore, serviceOrders: [dueSaturday, dueSunday, dueNextSaturday] },
          20: { address: laterStore, serviceOrders: [laterOrder] },
        });
        expect(view.selectedDueDate).toBeNull();
      }
    });
  });

  it("totals work hours over the service orders shown", () => {
    const walmart = makeAddress({ SiteId: 10, StoreName: "Walmart" });
    const target = makeAddress({ SiteId: 20, StoreName: "Target" });
    const repData = makeRepData({
      serviceOrders: [
        makeServiceOrder({ address: walmart, estimatedTime: 1.5, dueDate: SATURDAY }),
        makeServiceOrder({ address: walmart, estimatedTime: 2, dueDate: NEXT_SATURDAY }),
        makeServiceOrder({ address: walmart, estimatedTime: 4, parentCompany: "Globex" }),
        makeServiceOrder({ address: target, estimatedTime: 8 }),
      ],
    });

    expect(buildTerritoryView(repData, NO_FILTERS).totalWorkHours).toBe(15.5);
    expect(
      buildTerritoryView(repData, {
        ...NO_FILTERS,
        searchText: "walmart",
        selectedDueDate: SATURDAY,
        excludedParentCompanies: new Set(["Globex"]),
      }).totalWorkHours
    ).toBe(1.5);
  });

  describe("active-filter summary", () => {
    const store = makeAddress({ SiteId: 10 });
    const repData = makeRepData({
      serviceOrders: [
        makeServiceOrder({ address: store, parentCompany: "Acme" }),
        makeServiceOrder({ address: store, parentCompany: "Globex" }),
        makeServiceOrder({ address: store, parentCompany: "Initech" }),
      ],
    });

    it.each([
      {
        case: "no filters",
        filters: NO_FILTERS,
        expected: {
          isAnyFilterActive: false,
          areStoresWithoutPendingServiceOrdersHidden: false,
          isParentCompanyFilterActive: false,
          shownParentCompanyCount: 3,
          totalParentCompanyCount: 3,
        },
      },
      {
        case: "stores without pending service orders hidden",
        filters: { ...NO_FILTERS, showStoresWithoutPendingServiceOrders: false },
        expected: {
          isAnyFilterActive: true,
          areStoresWithoutPendingServiceOrdersHidden: true,
          isParentCompanyFilterActive: false,
          shownParentCompanyCount: 3,
          totalParentCompanyCount: 3,
        },
      },
      {
        case: "parent companies excluded",
        // Hooli isn't in this rep's schedule, so it doesn't count.
        filters: { ...NO_FILTERS, excludedParentCompanies: new Set(["Globex", "Hooli"]) },
        expected: {
          isAnyFilterActive: true,
          areStoresWithoutPendingServiceOrdersHidden: false,
          isParentCompanyFilterActive: true,
          shownParentCompanyCount: 2,
          totalParentCompanyCount: 3,
        },
      },
      {
        case: "both",
        filters: {
          ...NO_FILTERS,
          showStoresWithoutPendingServiceOrders: false,
          excludedParentCompanies: new Set(["Globex"]),
        },
        expected: {
          isAnyFilterActive: true,
          areStoresWithoutPendingServiceOrdersHidden: true,
          isParentCompanyFilterActive: true,
          shownParentCompanyCount: 2,
          totalParentCompanyCount: 3,
        },
      },
      {
        case: "only excluded parent companies the rep doesn't have",
        filters: { ...NO_FILTERS, excludedParentCompanies: new Set(["Hooli"]) },
        expected: {
          isAnyFilterActive: false,
          areStoresWithoutPendingServiceOrdersHidden: false,
          isParentCompanyFilterActive: false,
          shownParentCompanyCount: 3,
          totalParentCompanyCount: 3,
        },
      },
    ])("with $case", ({ filters, expected }) => {
      expect(buildTerritoryView(repData, filters).activeFilterSummary).toEqual(expected);
    });

    it("doesn't count search or the due date as active filters", () => {
      const view = buildTerritoryView(repData, {
        ...NO_FILTERS,
        searchText: "store",
        selectedDueDate: SATURDAY,
      });

      expect(view.activeFilterSummary.isAnyFilterActive).toBe(false);
    });
  });
});
