import { describe, expect, it } from "vitest";

import { TCalendarMode } from "@client/util/qtSurveyWorker/calendarMode";
import { TSchedule, TServiceOrder } from "@client/util/qtSurveyWorker/scheduleUtils";
import { TScheduleFilters, buildScheduleView } from "@client/util/qtSurveyWorker/scheduleView";
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
function makeUnscheduledOrder(overrides: { parentCompany?: string; description?: string } = {}) {
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
    selectedJobClients: new Set(serviceOrders.map((so) => so.JobClient)),
    searchQuery: "",
  };
}

describe("buildScheduleView", () => {
  describe("schedulable dates", () => {
    it("are the days inside an unscheduled service order's window", () => {
      const orders = [makeUnscheduledOrder()];

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

    it("leave out service orders the job client filter hides", () => {
      const acmeOrder = makeUnscheduledOrder({ parentCompany: "Acme" });
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
        { selectedJobClients: new Set(["Acme"]), searchQuery: "" },
        TODAY
      );

      expect(view.isDateSchedulable(TOMORROW)).toBe(true);
      expect(view.isDateSchedulable(NEXT_MONDAY)).toBe(false);
    });

    it("leave out service orders the search hides", () => {
      const orders = [makeUnscheduledOrder({ description: "Reset aisle" })];

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
      const orders = [makeUnscheduledOrder()];

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

  it("has no schedulable dates before a schedule loads", () => {
    const view = buildScheduleView(null, SINGLE_DATE, noFiltersFor([]), TODAY);

    expect(view.isDateSchedulable(TOMORROW)).toBe(false);
  });
});
