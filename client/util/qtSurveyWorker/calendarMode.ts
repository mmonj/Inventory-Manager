import { isSunday } from "@client/util/qtSurveyWorker/scheduleUtils";

/**
 * The Schedule page's calendar is always in exactly one mode. Each kind carries only its own
 * selections, and calendarModeReducer is the only way the mode changes, so the rules between
 * modes live here instead of in the page's event handlers.
 */
export type TCalendarMode =
  | { kind: "singleDate"; selectedDate: Date | undefined }
  | { kind: "dateSwap"; selectedDates: Date[] }
  | { kind: "autoSchedule"; selectedDates: Date[]; selectedServiceOrderIds: ReadonlySet<number> }
  | { kind: "bulkUnschedule"; selectedDates: Date[] };

type TCalendarModeKind = TCalendarMode["kind"];
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
  /** A date swap, auto-schedule or bulk unschedule went through and the schedule was refetched */
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

/** Applies `updateIds` to a copy of the auto-schedule selection. Other modes have none to change. */
function updateSelectedServiceOrderIds(
  calendarMode: TCalendarMode,
  updateIds: (selectedServiceOrderIds: Set<number>) => void
): TCalendarMode {
  if (calendarMode.kind !== "autoSchedule") {
    return calendarMode;
  }
  const selectedServiceOrderIds = new Set(calendarMode.selectedServiceOrderIds);
  updateIds(selectedServiceOrderIds);
  return { ...calendarMode, selectedServiceOrderIds };
}

export function calendarModeReducer(
  calendarMode: TCalendarMode,
  action: TCalendarModeAction
): TCalendarMode {
  switch (action.type) {
    case "enterMode":
      return calendarMode.kind === action.kind ? calendarMode : startMode(action.kind);
    case "leaveMode":
      return calendarMode.kind === "singleDate" ? calendarMode : INITIAL_CALENDAR_MODE;
    case "selectDate":
      return calendarMode.kind === "singleDate"
        ? { kind: "singleDate", selectedDate: action.date }
        : calendarMode;
    case "selectDates":
      if (calendarMode.kind === "singleDate") {
        return calendarMode;
      }
      if (calendarMode.kind === "dateSwap" && action.dates.length > MAX_DATE_SWAP_DATES) {
        return calendarMode;
      }
      return { ...calendarMode, selectedDates: action.dates };
    case "toggleServiceOrder":
      return updateSelectedServiceOrderIds(calendarMode, (selectedServiceOrderIds) => {
        if (!selectedServiceOrderIds.delete(action.serviceOrderId)) {
          selectedServiceOrderIds.add(action.serviceOrderId);
        }
      });
    case "selectServiceOrders":
      return updateSelectedServiceOrderIds(calendarMode, (selectedServiceOrderIds) => {
        for (const serviceOrderId of action.serviceOrderIds) {
          selectedServiceOrderIds.add(serviceOrderId);
        }
      });
    case "deselectServiceOrders":
      return updateSelectedServiceOrderIds(calendarMode, (selectedServiceOrderIds) => {
        for (const serviceOrderId of action.serviceOrderIds) {
          selectedServiceOrderIds.delete(serviceOrderId);
        }
      });
    case "fieldRepChanged":
    case "scheduleChangeApplied":
      return INITIAL_CALENDAR_MODE;
  }
}

/** What the calendar's date picker selects in the current calendar mode. */
type TDatePickerSelection =
  | { mode: "single"; selected: Date | undefined }
  | { mode: "multiple"; selected: Date[]; max: number | undefined };

export function getDatePickerSelection(calendarMode: TCalendarMode): TDatePickerSelection {
  if (calendarMode.kind === "singleDate") {
    return { mode: "single", selected: calendarMode.selectedDate };
  }
  if (calendarMode.kind === "dateSwap") {
    return { mode: "multiple", selected: calendarMode.selectedDates, max: MAX_DATE_SWAP_DATES };
  }
  return { mode: "multiple", selected: calendarMode.selectedDates, max: undefined };
}

/** What the schedule says about one calendar date, independent of the calendar mode. */
interface ICalendarDateFacts {
  date: Date;
  isPast: boolean;
  isSchedulable: boolean;
}

/**
 * Whether the calendar lets the date be picked in this mode. No mode picks a past date. Single
 * date, Date Swap and Bulk Unschedule pick dates that aren't schedulable too, to view, swap or
 * unschedule what's already there. Auto-Schedule only places unscheduled work, so it picks only
 * schedulable dates. Auto-Schedule and Date Swap both schedule onto the dates they're given, so
 * neither picks a Sunday (the server refuses it too).
 */
export function isDatePickable(
  calendarMode: TCalendarMode,
  dateFacts: ICalendarDateFacts
): boolean {
  if (dateFacts.isPast) {
    return false;
  }
  if (calendarMode.kind === "autoSchedule") {
    return dateFacts.isSchedulable && !isSunday(dateFacts.date);
  }
  if (calendarMode.kind === "dateSwap") {
    return !isSunday(dateFacts.date);
  }
  return true;
}
