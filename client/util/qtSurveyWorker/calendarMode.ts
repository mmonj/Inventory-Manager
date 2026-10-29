// The Schedule page's calendar is always in exactly one mode. Each kind carries only its own
// selections, and calendarModeReducer is the only way the mode changes, so the rules between
// modes live here instead of in the page's event handlers.

export type TCalendarMode =
  | { kind: "singleDate"; selectedDate: Date | undefined }
  | { kind: "dateSwap"; selectedDates: Date[] }
  | { kind: "autoSchedule"; selectedDates: Date[]; selectedServiceOrderIds: ReadonlySet<number> }
  | { kind: "bulkUnschedule"; selectedDates: Date[] };

export type TCalendarModeKind = TCalendarMode["kind"];
export type TEnterableModeKind = Exclude<TCalendarModeKind, "singleDate">;

export type TCalendarModeAction =
  | { type: "enterMode"; kind: TEnterableModeKind }
  | { type: "leaveMode" }
  | { type: "selectDate"; date: Date | undefined }
  | { type: "selectDates"; dates: Date[] }
  | { type: "toggleServiceOrder"; serviceOrderId: number }
  | { type: "selectServiceOrders"; serviceOrderIds: Iterable<number> }
  | { type: "deselectServiceOrders"; serviceOrderIds: Iterable<number> }
  | { type: "fieldRepChanged" }
  // A date swap, auto-schedule or bulk unschedule went through and the schedule was refetched
  | { type: "scheduleChangeApplied" };

const MAX_DATE_SWAP_DATES = 2;

export const INITIAL_CALENDAR_MODE: TCalendarMode = { kind: "singleDate", selectedDate: undefined };

function startMode(kind: TEnterableModeKind): TCalendarMode {
  switch (kind) {
    case "dateSwap":
      return { kind: "dateSwap", selectedDates: [] };
    case "autoSchedule":
      return { kind: "autoSchedule", selectedDates: [], selectedServiceOrderIds: new Set() };
    case "bulkUnschedule":
      return { kind: "bulkUnschedule", selectedDates: [] };
  }
}

export function calendarModeReducer(
  mode: TCalendarMode,
  action: TCalendarModeAction
): TCalendarMode {
  switch (action.type) {
    case "enterMode":
      return mode.kind === action.kind ? mode : startMode(action.kind);
    case "leaveMode":
      return mode.kind === "singleDate" ? mode : INITIAL_CALENDAR_MODE;
    case "selectDate":
      return mode.kind === "singleDate" ? { kind: "singleDate", selectedDate: action.date } : mode;
    case "selectDates":
      if (mode.kind === "singleDate") {
        return mode;
      }
      if (mode.kind === "dateSwap" && action.dates.length > MAX_DATE_SWAP_DATES) {
        return mode;
      }
      return { ...mode, selectedDates: action.dates };
    case "toggleServiceOrder": {
      if (mode.kind !== "autoSchedule") {
        return mode;
      }
      const selectedServiceOrderIds = new Set(mode.selectedServiceOrderIds);
      if (selectedServiceOrderIds.has(action.serviceOrderId)) {
        selectedServiceOrderIds.delete(action.serviceOrderId);
      } else {
        selectedServiceOrderIds.add(action.serviceOrderId);
      }
      return { ...mode, selectedServiceOrderIds };
    }
    case "selectServiceOrders": {
      if (mode.kind !== "autoSchedule") {
        return mode;
      }
      const selectedServiceOrderIds = new Set(mode.selectedServiceOrderIds);
      for (const serviceOrderId of action.serviceOrderIds) {
        selectedServiceOrderIds.add(serviceOrderId);
      }
      return { ...mode, selectedServiceOrderIds };
    }
    case "deselectServiceOrders": {
      if (mode.kind !== "autoSchedule") {
        return mode;
      }
      const selectedServiceOrderIds = new Set(mode.selectedServiceOrderIds);
      for (const serviceOrderId of action.serviceOrderIds) {
        selectedServiceOrderIds.delete(serviceOrderId);
      }
      return { ...mode, selectedServiceOrderIds };
    }
    case "fieldRepChanged":
    case "scheduleChangeApplied":
      return INITIAL_CALENDAR_MODE;
  }
}

// What the calendar's date picker selects in the current mode
export type TDatePickerSelection =
  | { mode: "single"; selected: Date | undefined }
  | { mode: "multiple"; selected: Date[]; max: number | undefined };

export function getDatePickerSelection(mode: TCalendarMode): TDatePickerSelection {
  if (mode.kind === "singleDate") {
    return { mode: "single", selected: mode.selectedDate };
  }
  if (mode.kind === "dateSwap") {
    return { mode: "multiple", selected: mode.selectedDates, max: MAX_DATE_SWAP_DATES };
  }
  return { mode: "multiple", selected: mode.selectedDates, max: undefined };
}
