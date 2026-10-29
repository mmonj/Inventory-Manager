import { describe, expect, it } from "vitest";

import {
  INITIAL_CALENDAR_MODE,
  TCalendarMode,
  TEnterableModeKind,
  calendarModeReducer,
} from "@client/util/qtSurveyWorker/calendarMode";

const MONDAY = new Date(2026, 10, 2);
const TUESDAY = new Date(2026, 10, 3);
const WEDNESDAY = new Date(2026, 10, 4);

// One mode of each kind, each with selections, to enter other modes from
const MODES_WITH_SELECTIONS: TCalendarMode[] = [
  { kind: "singleDate", selectedDate: MONDAY },
  { kind: "dateSwap", selectedDates: [MONDAY, TUESDAY] },
  { kind: "autoSchedule", selectedDates: [MONDAY], selectedServiceOrderIds: new Set([1, 2]) },
  { kind: "bulkUnschedule", selectedDates: [TUESDAY, WEDNESDAY] },
];

const ENTERED_MODES: (TCalendarMode & { kind: TEnterableModeKind })[] = [
  { kind: "dateSwap", selectedDates: [] },
  { kind: "autoSchedule", selectedDates: [], selectedServiceOrderIds: new Set() },
  { kind: "bulkUnschedule", selectedDates: [] },
];

describe("calendarModeReducer", () => {
  it("drops the selected date when entering a date swap", () => {
    const singleDate: TCalendarMode = { kind: "singleDate", selectedDate: MONDAY };

    const mode = calendarModeReducer(singleDate, { type: "enterMode", kind: "dateSwap" });

    expect(mode).toEqual({ kind: "dateSwap", selectedDates: [] });
  });

  describe.each(ENTERED_MODES)("entering $kind", (enteredMode) => {
    const otherModes = MODES_WITH_SELECTIONS.filter((mode) => mode.kind !== enteredMode.kind);

    it.each(otherModes)("from $kind replaces it with no selections", (previousMode) => {
      const mode = calendarModeReducer(previousMode, {
        type: "enterMode",
        kind: enteredMode.kind,
      });

      expect(mode).toEqual(enteredMode);
    });

    it("from itself keeps its selections", () => {
      const currentMode = MODES_WITH_SELECTIONS.find((mode) => mode.kind === enteredMode.kind)!;

      const mode = calendarModeReducer(currentMode, {
        type: "enterMode",
        kind: enteredMode.kind,
      });

      expect(mode).toBe(currentMode);
    });
  });

  it.each(MODES_WITH_SELECTIONS.filter((mode) => mode.kind !== "singleDate"))(
    "leaving $kind returns to singleDate with no date",
    (previousMode) => {
      const mode = calendarModeReducer(previousMode, { type: "leaveMode" });

      expect(mode).toEqual(INITIAL_CALENDAR_MODE);
    }
  );

  it("leaving while in singleDate keeps the selected date", () => {
    const singleDate: TCalendarMode = { kind: "singleDate", selectedDate: MONDAY };

    expect(calendarModeReducer(singleDate, { type: "leaveMode" })).toBe(singleDate);
  });

  describe("selecting dates", () => {
    it("selects a single date in singleDate", () => {
      const mode = calendarModeReducer(INITIAL_CALENDAR_MODE, { type: "selectDate", date: MONDAY });

      expect(mode).toEqual({ kind: "singleDate", selectedDate: MONDAY });
    });

    it("clears the single date in singleDate", () => {
      const singleDate: TCalendarMode = { kind: "singleDate", selectedDate: MONDAY };

      const mode = calendarModeReducer(singleDate, { type: "selectDate", date: undefined });

      expect(mode).toEqual(INITIAL_CALENDAR_MODE);
    });

    it("accepts up to two dates for a date swap", () => {
      const dateSwap: TCalendarMode = { kind: "dateSwap", selectedDates: [MONDAY] };

      const mode = calendarModeReducer(dateSwap, {
        type: "selectDates",
        dates: [MONDAY, TUESDAY],
      });

      expect(mode).toEqual({ kind: "dateSwap", selectedDates: [MONDAY, TUESDAY] });
    });

    it("rejects a third date for a date swap", () => {
      const dateSwap: TCalendarMode = { kind: "dateSwap", selectedDates: [MONDAY, TUESDAY] };

      const mode = calendarModeReducer(dateSwap, {
        type: "selectDates",
        dates: [MONDAY, TUESDAY, WEDNESDAY],
      });

      expect(mode).toBe(dateSwap);
    });

    it("keeps the selected service orders when auto-schedule dates change", () => {
      const autoSchedule: TCalendarMode = {
        kind: "autoSchedule",
        selectedDates: [MONDAY],
        selectedServiceOrderIds: new Set([7]),
      };

      const mode = calendarModeReducer(autoSchedule, {
        type: "selectDates",
        dates: [MONDAY, TUESDAY, WEDNESDAY],
      });

      expect(mode).toEqual({
        kind: "autoSchedule",
        selectedDates: [MONDAY, TUESDAY, WEDNESDAY],
        selectedServiceOrderIds: new Set([7]),
      });
    });

    it("accepts any number of dates for a bulk unschedule", () => {
      const bulkUnschedule: TCalendarMode = { kind: "bulkUnschedule", selectedDates: [] };

      const mode = calendarModeReducer(bulkUnschedule, {
        type: "selectDates",
        dates: [MONDAY, TUESDAY, WEDNESDAY],
      });

      expect(mode).toEqual({ kind: "bulkUnschedule", selectedDates: [MONDAY, TUESDAY, WEDNESDAY] });
    });

    it.each(MODES_WITH_SELECTIONS.filter((mode) => mode.kind !== "singleDate"))(
      "ignores a single date selection in $kind",
      (currentMode) => {
        const mode = calendarModeReducer(currentMode, { type: "selectDate", date: WEDNESDAY });

        expect(mode).toBe(currentMode);
      }
    );

    it("ignores a multi-date selection in singleDate", () => {
      const singleDate: TCalendarMode = { kind: "singleDate", selectedDate: MONDAY };

      const mode = calendarModeReducer(singleDate, { type: "selectDates", dates: [TUESDAY] });

      expect(mode).toBe(singleDate);
    });
  });

  describe("auto-schedule service orders", () => {
    const autoSchedule: TCalendarMode = {
      kind: "autoSchedule",
      selectedDates: [MONDAY],
      selectedServiceOrderIds: new Set([1, 2]),
    };

    it("toggles an unchecked service order on", () => {
      const mode = calendarModeReducer(autoSchedule, {
        type: "toggleServiceOrder",
        serviceOrderId: 3,
      });

      expect(mode).toEqual({ ...autoSchedule, selectedServiceOrderIds: new Set([1, 2, 3]) });
    });

    it("toggles a checked service order off", () => {
      const mode = calendarModeReducer(autoSchedule, {
        type: "toggleServiceOrder",
        serviceOrderId: 1,
      });

      expect(mode).toEqual({ ...autoSchedule, selectedServiceOrderIds: new Set([2]) });
    });

    it("selects a set of service orders on top of the current ones", () => {
      const mode = calendarModeReducer(autoSchedule, {
        type: "selectServiceOrders",
        serviceOrderIds: [2, 3, 4],
      });

      expect(mode).toEqual({ ...autoSchedule, selectedServiceOrderIds: new Set([1, 2, 3, 4]) });
    });

    it("deselects only the given service orders", () => {
      const mode = calendarModeReducer(autoSchedule, {
        type: "deselectServiceOrders",
        serviceOrderIds: [2, 3],
      });

      expect(mode).toEqual({ ...autoSchedule, selectedServiceOrderIds: new Set([1]) });
    });

    it.each(MODES_WITH_SELECTIONS.filter((mode) => mode.kind !== "autoSchedule"))(
      "ignores service order actions in $kind",
      (currentMode) => {
        expect(
          calendarModeReducer(currentMode, { type: "toggleServiceOrder", serviceOrderId: 1 })
        ).toBe(currentMode);
        expect(
          calendarModeReducer(currentMode, { type: "selectServiceOrders", serviceOrderIds: [1] })
        ).toBe(currentMode);
        expect(
          calendarModeReducer(currentMode, { type: "deselectServiceOrders", serviceOrderIds: [1] })
        ).toBe(currentMode);
      }
    );
  });

  it.each(MODES_WITH_SELECTIONS)(
    "a field rep change in $kind resets to singleDate with no date",
    (currentMode) => {
      const mode = calendarModeReducer(currentMode, { type: "fieldRepChanged" });

      expect(mode).toEqual(INITIAL_CALENDAR_MODE);
    }
  );

  it.each(MODES_WITH_SELECTIONS.filter((mode) => mode.kind !== "singleDate"))(
    "an applied schedule change in $kind resets to singleDate with no date",
    (currentMode) => {
      const mode = calendarModeReducer(currentMode, { type: "scheduleChangeApplied" });

      expect(mode).toEqual(INITIAL_CALENDAR_MODE);
    }
  );
});
