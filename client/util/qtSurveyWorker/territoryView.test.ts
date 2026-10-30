import { describe, expect, it } from "vitest";

import {
  SurveyWorkerQtraxViewsTemplatesTRecentlySeenStore,
  SurveyWorkerQtraxViewsTemplatesTVisitSequenceOutcome,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  interfaces,
} from "@reactivated";

import { makeAddress, makeServiceOrder } from "@client/util/qtSurveyWorker/serviceOrderFixtures";
import {
  TRepTerritoryData,
  TTerritoryFilters,
  TVisitSequenceInput,
  buildTerritoryView,
} from "@client/util/qtSurveyWorker/territoryView";

// 2026-10-31 is a Saturday, 2026-11-01 a Sunday, 2026-11-02 a Monday.
const SATURDAY = "2026-10-31T00:00:00";
const SUNDAY = "2026-11-01T00:00:00";
const MONDAY = "2026-11-02T00:00:00";
const NEXT_SATURDAY = "2026-11-07T00:00:00";

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

const REP = { id: 1, username: "rep_one" };

function onlyRep(repData: interfaces.QtTerritoryRepData): TRepTerritoryData[] {
  return [{ rep: REP, repData }];
}

/** What the view makes of the rep's service orders and recently seen stores: tagged with REP. */
function fromRep<T extends object>(...items: T[]): (T & { repUsername: string })[] {
  return items.map((item) => ({ ...item, repUsername: REP.username }));
}

const NO_FILTERS: TTerritoryFilters = {
  searchText: "",
  selectedDueDate: null,
  excludedParentCompanies: new Set(),
  showStoresWithoutPendingServiceOrders: true,
  excludedRepIds: new Set(),
};

describe("buildTerritoryView", () => {
  it("returns an empty view while the rep's data is missing", () => {
    const view = buildTerritoryView([{ rep: REP, repData: undefined }], NO_FILTERS);

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
      onlyRep(makeRepData({ serviceOrders: [firstOrder, secondOrder, thirdOrder] })),
      NO_FILTERS
    );

    expect(view.stores).toEqual({
      10: { address: firstStore, serviceOrders: fromRep(firstOrder, thirdOrder) },
      20: { address: secondStore, serviceOrders: fromRep(secondOrder) },
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
      const view = buildTerritoryView(onlyRep(repData), {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Globex"]),
      });

      expect(view.parentCompanies).toEqual(["Acme", "Globex", "Initech"]);
    });

    it("drops service orders of excluded parent companies and stores left with none", () => {
      const view = buildTerritoryView(onlyRep(repData), {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Globex", "Initech"]),
      });

      expect(view.stores).toEqual({ 10: { address: store, serviceOrders: fromRep(acmeOrder) } });
    });

    it("shows a parent company that wasn't around when the exclusions were made", () => {
      // The user excluded Globex while viewing a rep that never had Acme.
      const view = buildTerritoryView(onlyRep(repData), {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Globex", "Hooli"]),
      });

      expect(view.stores[10].serviceOrders).toEqual(fromRep(acmeOrder));
      expect(view.stores[20].serviceOrders).toEqual(fromRep(initechOrder));
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
      const view = buildTerritoryView(onlyRep(repData), NO_FILTERS);

      expect(view.recentlySeenStores).toEqual(
        fromRep(seenStoreWithoutSiteId, seenStoreWithoutOrders)
      );
    });

    it("includes a store once the parent-company filter removes all its service orders", () => {
      const view = buildTerritoryView(onlyRep(repData), {
        ...NO_FILTERS,
        excludedParentCompanies: new Set(["Acme"]),
      });

      expect(view.recentlySeenStores).toEqual(
        fromRep(seenStoreWithOrders, seenStoreWithoutSiteId, seenStoreWithoutOrders)
      );
    });

    it("are hidden when stores without pending service orders are hidden", () => {
      const view = buildTerritoryView(onlyRep(repData), {
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
      return Object.keys(
        buildTerritoryView(onlyRep(repData), { ...NO_FILTERS, searchText }).stores
      );
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
        buildTerritoryView(onlyRep(repData), { ...NO_FILTERS, searchText: "kroger" })
          .recentlySeenStores
      ).toEqual(fromRep(seenKroger));
      expect(
        buildTerritoryView(onlyRep(repData), { ...NO_FILTERS, searchText: "birch decatur" })
          .recentlySeenStores
      ).toEqual(fromRep(seenKroger));
    });

    it("doesn't turn a store with service orders into a recently seen one when search hides it", () => {
      const view = buildTerritoryView(onlyRep(repData), { ...NO_FILTERS, searchText: "target" });

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
      const view = buildTerritoryView(onlyRep(repData), NO_FILTERS);

      expect(view.dueDateOptions).toEqual([SATURDAY, SUNDAY, NEXT_SATURDAY]);
    });

    it("aren't changed by the other filters", () => {
      const view = buildTerritoryView(onlyRep(repData), {
        searchText: "nothing matches this",
        selectedDueDate: SATURDAY,
        excludedParentCompanies: new Set(["Globex"]),
        showStoresWithoutPendingServiceOrders: false,
        excludedRepIds: new Set(),
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
      const view = buildTerritoryView(onlyRep(repData), { ...NO_FILTERS, selectedDueDate: SUNDAY });

      expect(view.stores[10].serviceOrders).toEqual(fromRep(dueSaturday, dueSunday));
      expect(view.selectedDueDate).toBe(SUNDAY);
    });

    it("drops stores with no service orders left", () => {
      const view = buildTerritoryView(onlyRep(repData), { ...NO_FILTERS, selectedDueDate: SUNDAY });

      expect(Object.keys(view.stores)).toEqual(["10"]);
    });

    it("doesn't touch recently seen stores", () => {
      const view = buildTerritoryView(onlyRep(repData), {
        ...NO_FILTERS,
        selectedDueDate: SATURDAY,
      });

      expect(view.recentlySeenStores).toEqual(fromRep(seenStore));
    });

    it("is ignored when the selected date isn't one of the rep's due-date options", () => {
      // e.g. a date picked for another rep, or a weekday
      for (const staleDueDate of ["2026-10-24T00:00:00", MONDAY]) {
        const view = buildTerritoryView(onlyRep(repData), {
          ...NO_FILTERS,
          selectedDueDate: staleDueDate,
        });

        expect(view.stores).toEqual({
          10: {
            address: mixedStore,
            serviceOrders: fromRep(dueSaturday, dueSunday, dueNextSaturday),
          },
          20: { address: laterStore, serviceOrders: fromRep(laterOrder) },
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

    expect(buildTerritoryView(onlyRep(repData), NO_FILTERS).totalWorkHours).toBe(15.5);
    expect(
      buildTerritoryView(onlyRep(repData), {
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
          isRepFilterActive: false,
          shownRepCount: 1,
          totalRepCount: 1,
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
          isRepFilterActive: false,
          shownRepCount: 1,
          totalRepCount: 1,
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
          isRepFilterActive: false,
          shownRepCount: 1,
          totalRepCount: 1,
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
          isRepFilterActive: false,
          shownRepCount: 1,
          totalRepCount: 1,
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
          isRepFilterActive: false,
          shownRepCount: 1,
          totalRepCount: 1,
        },
      },
    ])("with $case", ({ filters, expected }) => {
      expect(buildTerritoryView(onlyRep(repData), filters).activeFilterSummary).toEqual(expected);
    });

    it("doesn't count search or the due date as active filters", () => {
      const view = buildTerritoryView(onlyRep(repData), {
        ...NO_FILTERS,
        searchText: "store",
        selectedDueDate: SATURDAY,
      });

      expect(view.activeFilterSummary.isAnyFilterActive).toBe(false);
    });
  });

  describe("combined territory", () => {
    const repOne = { id: 1, username: "rep_one" };
    const repTwo = { id: 2, username: "rep_two" };
    const sharedStore = makeAddress({ SiteId: 10 });
    const repTwoStore = makeAddress({ SiteId: 20 });
    const repOneOrder = makeServiceOrder({ address: sharedStore, estimatedTime: 1 });
    const repTwoSharedOrder = makeServiceOrder({ address: sharedStore, estimatedTime: 2 });
    const repTwoOrder = makeServiceOrder({ address: repTwoStore, estimatedTime: 4 });
    const repOneSeenStore = makeRecentlySeenStore({ id: 1, site_id: 30 });
    // rep_one saw it recently, but rep_two still has service orders there.
    const repOneSeenStoreWithRepTwoOrders = makeRecentlySeenStore({ id: 2, site_id: 20 });
    const repTwoSeenStore = makeRecentlySeenStore({ id: 3, site_id: 40 });

    const repTerritories: TRepTerritoryData[] = [
      {
        rep: repOne,
        repData: {
          ...makeRepData({
            serviceOrders: [repOneOrder],
            recentlySeenStores: [repOneSeenStore, repOneSeenStoreWithRepTwoOrders],
          }),
          rep_sync_data: { id: 1, schedule_last_refreshed: "2026-10-28T09:00:00Z" },
        },
      },
      {
        rep: repTwo,
        repData: makeRepData({
          serviceOrders: [repTwoSharedOrder, repTwoOrder],
          recentlySeenStores: [repTwoSeenStore],
        }),
      },
    ];

    it("puts every rep's service orders together, each tagged with its rep", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS);

      expect(view.stores).toEqual({
        10: {
          address: sharedStore,
          serviceOrders: [
            { ...repOneOrder, repUsername: "rep_one" },
            { ...repTwoSharedOrder, repUsername: "rep_two" },
          ],
        },
        20: { address: repTwoStore, serviceOrders: [{ ...repTwoOrder, repUsername: "rep_two" }] },
      });
      expect(view.totalWorkHours).toBe(7);
    });

    it("doesn't show a store as recently seen while another rep has service orders there", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS);

      expect(view.recentlySeenStores).toEqual([
        { ...repOneSeenStore, repUsername: "rep_one" },
        { ...repTwoSeenStore, repUsername: "rep_two" },
      ]);
    });

    it("hides an excluded rep's service orders and recently seen stores", () => {
      const view = buildTerritoryView(repTerritories, {
        ...NO_FILTERS,
        excludedRepIds: new Set([repTwo.id]),
      });

      expect(view.stores).toEqual({
        10: { address: sharedStore, serviceOrders: [{ ...repOneOrder, repUsername: "rep_one" }] },
      });
      // With rep_two hidden, nothing keeps store 20's red pin away.
      expect(view.recentlySeenStores).toEqual([
        { ...repOneSeenStore, repUsername: "rep_one" },
        { ...repOneSeenStoreWithRepTwoOrders, repUsername: "rep_one" },
      ]);
    });

    it("summarises each shown rep's hours, stores and last refresh", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS);

      expect(view.repSummaries).toEqual([
        {
          rep: repOne,
          totalWorkHours: 1,
          storeCount: 1,
          scheduleLastRefreshed: "2026-10-28T09:00:00Z",
        },
        { rep: repTwo, totalWorkHours: 6, storeCount: 2, scheduleLastRefreshed: null },
      ]);
    });

    it("leaves excluded reps and reps still loading out of the summaries", () => {
      const repThree = { id: 3, username: "rep_three" };
      const view = buildTerritoryView([...repTerritories, { rep: repThree, repData: undefined }], {
        ...NO_FILTERS,
        excludedRepIds: new Set([repOne.id]),
      });

      expect(view.repSummaries.map((repSummary) => repSummary.rep)).toEqual([repTwo]);
    });

    it("counts the rep filter as an active filter", () => {
      const view = buildTerritoryView(repTerritories, {
        ...NO_FILTERS,
        // Rep 9 isn't one of the given reps, so excluding it doesn't count.
        excludedRepIds: new Set([repTwo.id, 9]),
      });

      expect(view.activeFilterSummary).toMatchObject({
        isAnyFilterActive: true,
        isRepFilterActive: true,
        shownRepCount: 1,
        totalRepCount: 2,
      });
    });
  });

  describe("visit sequence", () => {
    const repOne = { id: 1, username: "rep_one" };
    const repTwo = { id: 2, username: "rep_two" };
    const visitedStore = makeAddress({ SiteId: 10, StoreName: "Walmart" });
    const remainingStore = makeAddress({ SiteId: 20, StoreName: "Target" });
    const visitedOrder = makeServiceOrder({ address: visitedStore, parentCompany: "Acme" });
    const remainingOrder = makeServiceOrder({ address: remainingStore, parentCompany: "Globex" });
    const visitedSeenStore = makeRecentlySeenStore({ id: 1, site_id: 30, name: "Kroger" });
    const remainingSeenStore = makeRecentlySeenStore({ id: 2, site_id: 40, name: "Aldi" });

    const repTerritories: TRepTerritoryData[] = [
      {
        rep: repOne,
        repData: makeRepData({
          serviceOrders: [visitedOrder, remainingOrder],
          recentlySeenStores: [visitedSeenStore, remainingSeenStore],
        }),
      },
    ];

    function makeOutcome(siteId: number): SurveyWorkerQtraxViewsTemplatesTVisitSequenceOutcome {
      return {
        site_id: siteId,
        kind: "visited",
        marked_by_username: "rep_one",
        marked_at: "2026-10-29T15:00:00Z",
      };
    }

    function withOutcomes(
      siteIds: number[],
      options: { showVisited: boolean } = { showVisited: true }
    ): TVisitSequenceInput {
      return {
        outcomesBySiteId: new Map(siteIds.map((siteId) => [siteId, makeOutcome(siteId)])),
        showVisited: options.showVisited,
      };
    }

    function siteIdsOf(entries: { siteId: number }[]): number[] {
      return entries.map((entry) => entry.siteId);
    }

    it("splits the stores into Remaining and Visited, with each store's outcome", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS, withOutcomes([10, 30]));

      expect(view.visitSequence?.remaining).toEqual([
        {
          kind: "withServiceOrders",
          siteId: 20,
          store: {
            address: remainingStore,
            serviceOrders: [{ ...remainingOrder, repUsername: "rep_one" }],
          },
        },
        {
          kind: "recentlySeen",
          siteId: 40,
          store: { ...remainingSeenStore, repUsername: "rep_one" },
        },
      ]);
      expect(siteIdsOf(view.visitSequence?.visited ?? [])).toEqual([10, 30]);
      expect(view.visitSequence?.outcomesBySiteId).toEqual(
        new Map([
          [10, makeOutcome(10)],
          [30, makeOutcome(30)],
        ])
      );
    });

    it("hides the Visited group and takes visited stores off the map while show visited is off", () => {
      const view = buildTerritoryView(
        repTerritories,
        NO_FILTERS,
        withOutcomes([10, 30], { showVisited: false })
      );

      expect(siteIdsOf(view.visitSequence?.remaining ?? [])).toEqual([20, 40]);
      expect(view.visitSequence?.visited).toEqual([]);
      expect(Object.keys(view.stores)).toEqual(["20"]);
      expect(view.recentlySeenStores).toEqual([{ ...remainingSeenStore, repUsername: "rep_one" }]);
    });

    it("pins visited stores on the map while show visited is on", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS, withOutcomes([10, 30]));

      expect(Object.keys(view.stores)).toEqual(["10", "20"]);
      expect(view.recentlySeenStores.map((store) => store.site_id)).toEqual([30, 40]);
    });

    it("counts a store shared by two reps once", () => {
      const sharedStore = makeAddress({ SiteId: 50 });
      const sharedSeenStore = makeRecentlySeenStore({ id: 5, site_id: 60 });
      const sharedRepTerritories: TRepTerritoryData[] = [
        {
          rep: repOne,
          repData: makeRepData({
            serviceOrders: [makeServiceOrder({ address: sharedStore })],
            recentlySeenStores: [sharedSeenStore],
          }),
        },
        {
          rep: repTwo,
          repData: makeRepData({
            serviceOrders: [makeServiceOrder({ address: sharedStore })],
            recentlySeenStores: [sharedSeenStore],
          }),
        },
      ];

      const view = buildTerritoryView(sharedRepTerritories, NO_FILTERS, withOutcomes([50]));

      expect(view.visitSequence?.progress).toEqual({ visitedCount: 1, leftCount: 1 });
      expect(siteIdsOf(view.visitSequence?.visited ?? [])).toEqual([50]);
      expect(siteIdsOf(view.visitSequence?.remaining ?? [])).toEqual([60]);
      expect(view.recentlySeenStores).toEqual([{ ...sharedSeenStore, repUsername: "rep_one" }]);
    });

    it("ignores outcomes of stores outside the sequence", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS, withOutcomes([10, 999]));

      expect([...(view.visitSequence?.outcomesBySiteId.keys() ?? [])]).toEqual([10]);
      expect(view.visitSequence?.progress).toEqual({ visitedCount: 1, leftCount: 3 });
    });

    it("counts progress over the whole sequence, whatever filters are on", () => {
      const twoRepTerritories: TRepTerritoryData[] = [
        ...repTerritories,
        {
          rep: repTwo,
          repData: makeRepData({
            serviceOrders: [makeServiceOrder({ address: makeAddress({ SiteId: 70 }) })],
          }),
        },
      ];

      const view = buildTerritoryView(
        twoRepTerritories,
        {
          searchText: "walmart",
          selectedDueDate: null,
          excludedParentCompanies: new Set(["Acme"]),
          showStoresWithoutPendingServiceOrders: false,
          excludedRepIds: new Set([repTwo.id]),
        },
        withOutcomes([10, 30])
      );

      expect(view.visitSequence?.remaining).toEqual([]);
      expect(view.visitSequence?.visited).toEqual([]);
      expect(view.visitSequence?.progress).toEqual({ visitedCount: 2, leftCount: 3 });
      expect(view.visitSequence?.isAllDone).toBe(false);
    });

    it("is all done once every store has an outcome", () => {
      expect(
        buildTerritoryView(repTerritories, NO_FILTERS, withOutcomes([10, 20, 30])).visitSequence
          ?.isAllDone
      ).toBe(false);
      expect(
        buildTerritoryView(repTerritories, NO_FILTERS, withOutcomes([10, 20, 30, 40])).visitSequence
          ?.isAllDone
      ).toBe(true);
    });

    it("isn't all done while the reps' data is still loading", () => {
      const view = buildTerritoryView(
        [{ rep: repOne, repData: undefined }],
        NO_FILTERS,
        withOutcomes([10])
      );

      expect(view.visitSequence?.isAllDone).toBe(false);
      expect(view.visitSequence?.progress).toEqual({ visitedCount: 0, leftCount: 0 });
    });

    it("isn't worked out without a visit-sequence input", () => {
      const view = buildTerritoryView(repTerritories, NO_FILTERS);

      expect(view.visitSequence).toBeNull();
      expect(Object.keys(view.stores)).toEqual(["10", "20"]);
      expect(view.recentlySeenStores.map((store) => store.site_id)).toEqual([30, 40]);
    });
  });
});
