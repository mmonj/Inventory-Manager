import { describe, expect, it } from "vitest";

import { TCalendarMode } from "@client/util/qtSurveyWorker/calendarMode";
import { TSchedule, TServiceOrder } from "@client/util/qtSurveyWorker/scheduleUtils";
import {
  TScheduleFilters,
  buildScheduleView,
  getDefaultSelectedDate,
} from "@client/util/qtSurveyWorker/scheduleView";
import { makeAddress, makeServiceOrder } from "@client/util/qtSurveyWorker/serviceOrderFixtures";

// 2026-11-01 is a Sunday, 2026-11-02 a Monday.
const UNSCHEDULED_DATE = "0001-01-01T00:00:00";
const TODAY = new Date(2026, 10, 2, 9, 30);
const YESTERDAY = new Date(2026, 10, 1);
const TOMORROW = new Date(2026, 10, 3);
const WEDNESDAY = new Date(2026, 10, 4);
const NEXT_MONDAY = new Date(2026, 10, 9);

const SINGLE_DATE: TCalendarMode = { kind: "singleDate", selectedDate: undefined };
const AUTO_SCHEDULE: TCalendarMode = {
  kind: "autoSchedule",
  selectedDates: [],
  selectedServiceOrderIds: new Set(),
};

const STORE = makeAddress({ SiteId: 10 });

function makeSchedule(options: {
  serviceOrders: TServiceOrder[];
  allowSchedulingDates?: string[];
}): TSchedule {
  return {
    ServiceOrders: options.serviceOrders,
    UnscheduledDate: UNSCHEDULED_DATE,
    AllowSchedulingDates: options.allowSchedulingDates ?? ["2026-11-02T00:00:00"],
  } as unknown as TSchedule;
}

/** An unscheduled service order whose window runs from Tuesday to Wednesday. */
function makeUnscheduledServiceOrder(
  overrides: { parentCompany?: string; description?: string } = {}
) {
  return makeServiceOrder({
    address: STORE,
    windowStart: "2026-11-03T00:00:00",
    dueDate: "2026-11-04T00:00:00",
    dateScheduled: UNSCHEDULED_DATE,
    ...overrides,
  });
}

function noFiltersFor(serviceOrders: TServiceOrder[]): TScheduleFilters {
  return {
    selectedParentCompanies: new Set(serviceOrders.map((so) => so.JobClient)),
    searchQuery: "",
  };
}

describe("buildScheduleView", () => {
  describe("schedulable dates", () => {
    it("are the days inside an unscheduled service order's window", () => {
      const orders = [makeUnscheduledServiceOrder()];

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: orders }),
        SINGLE_DATE,
        noFiltersFor(orders),
        TODAY
      );

      expect(view.isDateSchedulable(TOMORROW)).toBe(true);
      expect(view.isDateSchedulable(WEDNESDAY)).toBe(true);
      expect(view.isDateSchedulable(NEXT_MONDAY)).toBe(false);
    });

    it("ignore service orders already on the calendar", () => {
      const orders = [
        makeServiceOrder({
          address: STORE,
          windowStart: "2026-11-03T00:00:00",
          dueDate: "2026-11-04T00:00:00",
          dateScheduled: "2026-11-03T00:00:00",
        }),
      ];

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: orders }),
        SINGLE_DATE,
        noFiltersFor(orders),
        TODAY
      );

      expect(view.isDateSchedulable(TOMORROW)).toBe(false);
    });

    it("are never past", () => {
      const orders = [
        makeServiceOrder({
          address: STORE,
          windowStart: "2026-10-30T00:00:00",
          dueDate: "2026-11-04T00:00:00",
          dateScheduled: UNSCHEDULED_DATE,
        }),
      ];

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: orders }),
        SINGLE_DATE,
        noFiltersFor(orders),
        TODAY
      );

      expect(view.isDateSchedulable(YESTERDAY)).toBe(false);
      expect(view.isDateSchedulable(TOMORROW)).toBe(true);
    });

    it("include today only while Qt still allows scheduling today", () => {
      const orders = [
        makeServiceOrder({
          address: STORE,
          windowStart: "2026-11-02T00:00:00",
          dueDate: "2026-11-04T00:00:00",
          dateScheduled: UNSCHEDULED_DATE,
        }),
      ];
      const filters = noFiltersFor(orders);

      const allowedView = buildScheduleView(
        makeSchedule({ serviceOrders: orders, allowSchedulingDates: ["2026-11-02T00:00:00"] }),
        SINGLE_DATE,
        filters,
        TODAY
      );
      const cutOffView = buildScheduleView(
        makeSchedule({ serviceOrders: orders, allowSchedulingDates: ["2026-11-03T00:00:00"] }),
        SINGLE_DATE,
        filters,
        TODAY
      );

      expect(allowedView.isDateSchedulable(TODAY)).toBe(true);
      expect(cutOffView.isDateSchedulable(TODAY)).toBe(false);
    });

    it("leave out service orders the parent company filter hides", () => {
      const acmeOrder = makeUnscheduledServiceOrder({ parentCompany: "Acme" });
      const globexOrder = makeServiceOrder({
        address: STORE,
        parentCompany: "Globex",
        windowStart: "2026-11-09T00:00:00",
        dueDate: "2026-11-09T00:00:00",
        dateScheduled: UNSCHEDULED_DATE,
      });

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: [acmeOrder, globexOrder] }),
        SINGLE_DATE,
        { selectedParentCompanies: new Set(["Acme"]), searchQuery: "" },
        TODAY
      );

      expect(view.isDateSchedulable(TOMORROW)).toBe(true);
      expect(view.isDateSchedulable(NEXT_MONDAY)).toBe(false);
    });

    it("leave out service orders the search hides", () => {
      const orders = [makeUnscheduledServiceOrder({ description: "Reset aisle" })];

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: orders }),
        SINGLE_DATE,
        { ...noFiltersFor(orders), searchQuery: "planogram audit" },
        TODAY
      );

      expect(view.isDateSchedulable(TOMORROW)).toBe(false);
    });
  });

  describe("pickable dates", () => {
    it("skip the past in every mode", () => {
      const view = buildScheduleView(
        makeSchedule({ serviceOrders: [] }),
        SINGLE_DATE,
        noFiltersFor([]),
        TODAY
      );

      expect(view.isDatePickable(YESTERDAY)).toBe(false);
      expect(view.isDatePickable(NEXT_MONDAY)).toBe(true);
    });

    it("skip today once Qt's same-day cutoff has passed", () => {
      const view = buildScheduleView(
        makeSchedule({ serviceOrders: [], allowSchedulingDates: ["2026-11-03T00:00:00"] }),
        SINGLE_DATE,
        noFiltersFor([]),
        TODAY
      );

      expect(view.isDatePickable(TODAY)).toBe(false);
      expect(view.isDatePickable(TOMORROW)).toBe(true);
    });

    it("follow the calendar mode's rule on schedulable dates", () => {
      const orders = [makeUnscheduledServiceOrder()];

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: orders }),
        AUTO_SCHEDULE,
        noFiltersFor(orders),
        TODAY
      );

      expect(view.isDatePickable(TOMORROW)).toBe(true);
      expect(view.isDatePickable(NEXT_MONDAY)).toBe(false);
    });
  });

  describe("unscheduled list", () => {
    // Window Tuesday to Wednesday, and one for next Monday only
    const midweekOrder = makeUnscheduledServiceOrder();
    const nextMondayOrder = makeServiceOrder({
      address: STORE,
      windowStart: "2026-11-09T00:00:00",
      dueDate: "2026-11-09T00:00:00",
      dateScheduled: UNSCHEDULED_DATE,
      estimatedTime: 3,
    });
    const orders = [midweekOrder, nextMondayOrder];
    const schedule = makeSchedule({ serviceOrders: orders });

    it("leaves out service orders whose window has closed", () => {
      const closedOrder = makeServiceOrder({
        address: STORE,
        windowStart: "2026-10-26T00:00:00",
        dueDate: "2026-10-31T00:00:00",
        dateScheduled: UNSCHEDULED_DATE,
      });

      const view = buildScheduleView(
        makeSchedule({ serviceOrders: [closedOrder, midweekOrder] }),
        SINGLE_DATE,
        noFiltersFor([closedOrder, midweekOrder]),
        TODAY
      );

      expect(view.unscheduledServiceOrders).toEqual([midweekOrder]);
    });

    it("counts every eligible service order, whatever the filters hide", () => {
      const view = buildScheduleView(
        schedule,
        SINGLE_DATE,
        { selectedParentCompanies: new Set(), searchQuery: "" },
        TODAY
      );

      expect(view.unscheduledServiceOrders).toEqual([]);
      expect(view.eligibleUnscheduledServiceOrders).toEqual(orders);
    });

    it("keeps only the service orders that fit a picked auto-schedule date", () => {
      const view = buildScheduleView(
        schedule,
        { ...AUTO_SCHEDULE, selectedDates: [NEXT_MONDAY] },
        noFiltersFor(orders),
        TODAY
      );

      expect(view.unscheduledServiceOrders).toEqual([nextMondayOrder]);
    });

    it("splits by whether the selected date is inside each window", () => {
      const view = buildScheduleView(
        schedule,
        { kind: "singleDate", selectedDate: TOMORROW },
        noFiltersFor(orders),
        TODAY
      );

      expect(view.schedulableForSelectedDate).toEqual([midweekOrder]);
      expect(view.outsideWindowForSelectedDate).toEqual([nextMondayOrder]);
    });

    it("counts everything as schedulable while no date is selected", () => {
      const view = buildScheduleView(schedule, SINGLE_DATE, noFiltersFor(orders), TODAY);

      expect(view.schedulableForSelectedDate).toEqual(orders);
      expect(view.outsideWindowForSelectedDate).toEqual([]);
    });
  });

  describe("auto-schedule selection", () => {
    const acmeOrder = makeServiceOrder({
      address: STORE,
      parentCompany: "Acme",
      windowStart: "2026-11-03T00:00:00",
      dueDate: "2026-11-04T00:00:00",
      dateScheduled: UNSCHEDULED_DATE,
      estimatedTime: 2,
    });
    const globexOrder = makeServiceOrder({
      address: STORE,
      parentCompany: "Globex",
      windowStart: "2026-11-03T00:00:00",
      dueDate: "2026-11-04T00:00:00",
      dateScheduled: UNSCHEDULED_DATE,
      estimatedTime: 5,
    });
    const schedule = makeSchedule({ serviceOrders: [acmeOrder, globexOrder] });
    const bothSelected: TCalendarMode = {
      kind: "autoSchedule",
      selectedDates: [TOMORROW, WEDNESDAY],
      selectedServiceOrderIds: new Set([acmeOrder.ServiceOrderId, globexOrder.ServiceOrderId]),
    };

    it("counts only the checked service orders still in the list", () => {
      const view = buildScheduleView(
        schedule,
        bothSelected,
        { selectedParentCompanies: new Set(["Acme"]), searchQuery: "" },
        TODAY
      );

      expect(view.visibleUnscheduledServiceOrderIds).toEqual(new Set([acmeOrder.ServiceOrderId]));
      expect(view.visibleAutoScheduleSelectedServiceOrderIds).toEqual(
        new Set([acmeOrder.ServiceOrderId])
      );
    });

    it("averages the visible checked hours over the picked dates", () => {
      const view = buildScheduleView(
        schedule,
        bothSelected,
        noFiltersFor([acmeOrder, globexOrder]),
        TODAY
      );

      expect(view.autoScheduleAverageHoursPerDay).toBe(3.5);
    });

    it("has no average until both dates and service orders are picked", () => {
      const view = buildScheduleView(
        schedule,
        { ...bothSelected, selectedDates: [] },
        noFiltersFor([acmeOrder, globexOrder]),
        TODAY
      );

      expect(view.autoScheduleAverageHoursPerDay).toBeNull();
    });

    it("has nothing selected outside auto-schedule", () => {
      const view = buildScheduleView(
        schedule,
        SINGLE_DATE,
        noFiltersFor([acmeOrder, globexOrder]),
        TODAY
      );

      expect(view.visibleAutoScheduleSelectedServiceOrderIds).toEqual(new Set());
    });
  });

  describe("scheduled service orders", () => {
    const tuesdayVisit = makeServiceOrder({
      address: STORE,
      dateScheduled: "2026-11-03T00:00:00",
      estimatedTime: 2,
    });
    const tuesdayDriveTime = makeServiceOrder({
      address: makeAddress({ SiteId: 20, IsPhysicalVisit: false }),
      dateScheduled: "2026-11-03T00:00:00",
      estimatedTime: 0.5,
    });
    const wednesdayVisit = makeServiceOrder({
      address: STORE,
      dateScheduled: "2026-11-04T00:00:00",
      estimatedTime: 1,
    });
    const orders = [tuesdayVisit, tuesdayDriveTime, wednesdayVisit, makeUnscheduledServiceOrder()];
    const schedule = makeSchedule({ serviceOrders: orders });

    it("sums each scheduled date's service orders and hours", () => {
      const view = buildScheduleView(schedule, SINGLE_DATE, noFiltersFor(orders), TODAY);

      expect(view.daySummaries).toEqual(
        new Map([
          ["2026-11-03", { serviceOrderCount: 2, totalHours: 2.5 }],
          ["2026-11-04", { serviceOrderCount: 1, totalHours: 1 }],
        ])
      );
    });

    it("lists what's scheduled on the selected date, and its physical visits", () => {
      const view = buildScheduleView(
        schedule,
        { kind: "singleDate", selectedDate: TOMORROW },
        noFiltersFor(orders),
        TODAY
      );

      expect(view.serviceOrdersForSelectedDate).toEqual([tuesdayVisit, tuesdayDriveTime]);
      expect(view.physicalVisitServiceOrdersForSelectedDate).toEqual([tuesdayVisit]);
    });

    it("lists nothing while no date is selected", () => {
      const view = buildScheduleView(schedule, SINGLE_DATE, noFiltersFor(orders), TODAY);

      expect(view.serviceOrdersForSelectedDate).toEqual([]);
      expect(view.physicalVisitServiceOrdersForSelectedDate).toEqual([]);
    });

    it("finds the physical visits on any date", () => {
      const view = buildScheduleView(schedule, SINGLE_DATE, noFiltersFor(orders), TODAY);

      expect(view.getPhysicalVisitsOn(TOMORROW)).toEqual([tuesdayVisit]);
      expect(view.getPhysicalVisitsOn(NEXT_MONDAY)).toEqual([]);
    });
  });

  it("has no schedulable dates before a schedule loads", () => {
    const view = buildScheduleView(null, SINGLE_DATE, noFiltersFor([]), TODAY);

    expect(view.isDateSchedulable(TOMORROW)).toBe(false);
  });
});

describe("getDefaultSelectedDate", () => {
  it("is today while Qt still allows scheduling today", () => {
    const schedule = makeSchedule({ serviceOrders: [] });

    expect(getDefaultSelectedDate(schedule, TODAY)).toEqual(new Date(2026, 10, 2));
  });

  it("is tomorrow once Qt's same-day cutoff has passed", () => {
    const schedule = makeSchedule({
      serviceOrders: [],
      allowSchedulingDates: ["2026-11-03T00:00:00"],
    });

    expect(getDefaultSelectedDate(schedule, TODAY)).toEqual(TOMORROW);
  });
});
