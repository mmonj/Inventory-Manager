import { TCalendarMode, isDatePickable } from "@client/util/qtSurveyWorker/calendarMode";
import {
  TSchedule,
  TServiceOrder,
  getServiceOrderSearchKey,
  matchesSearch,
  toDateKey,
} from "@client/util/qtSurveyWorker/scheduleUtils";

/** What the user has narrowed the Unscheduled list down to. */
export interface TScheduleFilters {
  selectedJobClients: ReadonlySet<string>;
  searchQuery: string;
}

/** Everything the Schedule page shows for a field rep's schedule under the current filters. */
export interface TScheduleView {
  /**
   * Unscheduled service orders whose window hasn't closed, before the job client filter and
   * search. The fixed total for the "showing X of Y" banner.
   */
  eligibleUnscheduledServiceOrders: TServiceOrder[];
  /**
   * The eligible ones left after the job client filter and search. Not narrowed to the picked
   * auto-schedule dates, so picking one doesn't lock out dates only other windows cover.
   */
  filteredUnscheduledServiceOrders: TServiceOrder[];
  /** Whether the date is a schedulable date for the filtered unscheduled service orders. */
  isDateSchedulable: (date: Date) => boolean;
  /** Whether the calendar lets the date be picked in the current calendar mode. */
  isDatePickable: (date: Date) => boolean;
}

function startOfDay(date: Date): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

/**
 * Every day covered by at least one service order's window, not just the overall min/max
 * span, since a day inside that span can have nothing left to schedule on it.
 */
function getWindowDateKeys(serviceOrders: TServiceOrder[]): Set<string> {
  const dateKeys = new Set<string>();

  for (const so of serviceOrders) {
    const cursor = startOfDay(new Date(so.DateScheduleRangeStart));
    const windowEnd = startOfDay(new Date(so.DateScheduleRangeEnd));

    while (cursor <= windowEnd) {
      dateKeys.add(toDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return dateKeys;
}

export function buildScheduleView(
  schedule: TSchedule | null,
  calendarMode: TCalendarMode,
  filters: TScheduleFilters,
  today: Date
): TScheduleView {
  const todayStart = startOfDay(today);
  const todayKey = toDateKey(todayStart);
  // Qt has its own same-day cutoff, so today counts as past once Qt stops allowing it
  const isTodayAllowed =
    schedule !== null &&
    schedule.AllowSchedulingDates.some((isoStr) => toDateKey(new Date(isoStr)) === todayKey);

  const eligibleUnscheduledServiceOrders =
    schedule === null
      ? []
      : schedule.ServiceOrders.filter(
          (so) =>
            so.DateScheduled === schedule.UnscheduledDate &&
            new Date(so.DateScheduleRangeEnd) >= todayStart
        );

  const filteredUnscheduledServiceOrders = eligibleUnscheduledServiceOrders.filter(
    (so) =>
      filters.selectedJobClients.has(so.JobClient) &&
      matchesSearch(getServiceOrderSearchKey(so), filters.searchQuery)
  );

  const windowDateKeys = getWindowDateKeys(filteredUnscheduledServiceOrders);

  function isPast(date: Date): boolean {
    if (toDateKey(date) === todayKey) {
      return !isTodayAllowed;
    }
    return date < todayStart;
  }

  function isDateSchedulable(date: Date): boolean {
    return !isPast(date) && windowDateKeys.has(toDateKey(date));
  }

  return {
    eligibleUnscheduledServiceOrders,
    filteredUnscheduledServiceOrders,
    isDateSchedulable,
    isDatePickable: (date) =>
      isDatePickable(calendarMode, {
        date,
        isPast: isPast(date),
        isSchedulable: isDateSchedulable(date),
      }),
  };
}
