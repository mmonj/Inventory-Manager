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
  selectedParentCompanies: ReadonlySet<string>;
  searchQuery: string;
}

/** What's scheduled on one calendar date. */
export interface TDaySummary {
  serviceOrderCount: number;
  totalHours: number;
}

/** Everything the Schedule page shows for a field rep's schedule under the current filters. */
export interface TScheduleView {
  /**
   * Unscheduled service orders whose window hasn't closed, before the parent company filter and
   * search. The fixed total for the "showing X of Y" banner.
   */
  eligibleUnscheduledServiceOrders: TServiceOrder[];
  /**
   * The eligible ones left after the parent company filter and search. Not narrowed to the picked
   * auto-schedule dates, so picking one doesn't lock out dates only other windows cover.
   */
  filteredUnscheduledServiceOrders: TServiceOrder[];
  /**
   * The Unscheduled list. Once auto-schedule dates are picked, only the filtered ones that fit
   * at least one of them, since the rest can't be auto-scheduled anyway.
   */
  unscheduledServiceOrders: TServiceOrder[];
  /** The listed ones whose window covers the selected date, or all of them with no date. */
  schedulableForSelectedDate: TServiceOrder[];
  /** The listed ones whose window doesn't cover the selected date, shown with the reason. */
  outsideWindowForSelectedDate: TServiceOrder[];
  visibleUnscheduledServiceOrderIds: Set<number>;
  /**
   * The auto-schedule selection keeps service orders that a filter or search hides, so they're
   * still checked when they come back. Only the listed checked ones count: for the selected
   * count, the average hours per day and what gets sent to auto-schedule.
   */
  visibleAutoScheduleSelectedServiceOrderIds: Set<number>;
  /**
   * A rough estimate while picking: the checked hours spread evenly over the picked dates,
   * without the server's grouping by store. Null until both are picked.
   */
  autoScheduleAverageHoursPerDay: number | null;
  /** Keyed by date key, for every date with something scheduled on it. */
  daySummaries: Map<string, TDaySummary>;
  /** Everything scheduled on the selected date, or nothing with no date selected. */
  serviceOrdersForSelectedDate: TServiceOrder[];
  physicalVisitServiceOrdersForSelectedDate: TServiceOrder[];
  /** Physical visits scheduled on the date, leaving out entries like drive time. */
  getPhysicalVisitsOn: (date: Date) => TServiceOrder[];
  /** Whether the date is a schedulable date for the filtered unscheduled service orders. */
  isDateSchedulable: (date: Date) => boolean;
  /** Whether the calendar lets the date be picked in the current calendar mode. */
  isDatePickable: (date: Date) => boolean;
}

function isInWindow(so: TServiceOrder, date: Date): boolean {
  return date >= new Date(so.DateScheduleRangeStart) && date <= new Date(so.DateScheduleRangeEnd);
}

function startOfDay(date: Date): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

/** Qt has its own same-day cutoff, after which it stops allowing scheduling today. */
function isTodayAllowed(schedule: TSchedule, today: Date): boolean {
  const todayKey = toDateKey(today);
  return schedule.AllowSchedulingDates.some((isoStr) => toDateKey(new Date(isoStr)) === todayKey);
}

/**
 * The date to select right after a field rep's schedule first loads: today, or tomorrow once
 * Qt has stopped allowing scheduling today.
 */
export function getDefaultSelectedDate(schedule: TSchedule, today: Date): Date {
  const defaultDate = startOfDay(today);
  if (!isTodayAllowed(schedule, today)) {
    defaultDate.setDate(defaultDate.getDate() + 1);
  }
  return defaultDate;
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
  // Today counts as past once Qt's same-day cutoff has passed
  const isTodayPast = schedule === null || !isTodayAllowed(schedule, todayStart);

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
      filters.selectedParentCompanies.has(so.JobClient) &&
      matchesSearch(getServiceOrderSearchKey(so), filters.searchQuery)
  );

  const windowDateKeys = getWindowDateKeys(filteredUnscheduledServiceOrders);

  const autoScheduleSelectedDates =
    calendarMode.kind === "autoSchedule" ? calendarMode.selectedDates : [];
  const unscheduledServiceOrders =
    autoScheduleSelectedDates.length === 0
      ? filteredUnscheduledServiceOrders
      : filteredUnscheduledServiceOrders.filter((so) =>
          autoScheduleSelectedDates.some((date) => isInWindow(so, date))
        );

  const selectedDate = calendarMode.kind === "singleDate" ? calendarMode.selectedDate : undefined;
  const schedulableForSelectedDate =
    selectedDate === undefined
      ? unscheduledServiceOrders
      : unscheduledServiceOrders.filter((so) => isInWindow(so, selectedDate));
  const outsideWindowForSelectedDate =
    selectedDate === undefined
      ? []
      : unscheduledServiceOrders.filter((so) => !isInWindow(so, selectedDate));

  const visibleUnscheduledServiceOrderIds = new Set(
    unscheduledServiceOrders.map((so) => so.ServiceOrderId)
  );
  const autoScheduleSelectedServiceOrderIds =
    calendarMode.kind === "autoSchedule" ? calendarMode.selectedServiceOrderIds : new Set<number>();
  const visibleAutoScheduleSelectedServiceOrders = unscheduledServiceOrders.filter((so) =>
    autoScheduleSelectedServiceOrderIds.has(so.ServiceOrderId)
  );
  const autoScheduleSelectedHours = visibleAutoScheduleSelectedServiceOrders.reduce(
    (sum, so) => sum + so.EstimatedTime,
    0
  );

  const scheduledServiceOrders =
    schedule === null
      ? []
      : schedule.ServiceOrders.filter((so) => so.DateScheduled !== schedule.UnscheduledDate);

  const daySummaries = new Map<string, TDaySummary>();
  for (const so of scheduledServiceOrders) {
    const dateKey = toDateKey(new Date(so.DateScheduled));
    const daySummary = daySummaries.get(dateKey) ?? { serviceOrderCount: 0, totalHours: 0 };
    daySummary.serviceOrderCount += 1;
    daySummary.totalHours += so.EstimatedTime;
    daySummaries.set(dateKey, daySummary);
  }

  function getServiceOrdersOn(date: Date): TServiceOrder[] {
    const dateKey = toDateKey(date);
    return scheduledServiceOrders.filter((so) => toDateKey(new Date(so.DateScheduled)) === dateKey);
  }

  function getPhysicalVisitsOn(date: Date): TServiceOrder[] {
    return getServiceOrdersOn(date).filter((so) => so.Address.IsPhysicalVisit);
  }

  function isPast(date: Date): boolean {
    if (toDateKey(date) === todayKey) {
      return isTodayPast;
    }
    return date < todayStart;
  }

  function isDateSchedulable(date: Date): boolean {
    return !isPast(date) && windowDateKeys.has(toDateKey(date));
  }

  return {
    eligibleUnscheduledServiceOrders,
    filteredUnscheduledServiceOrders,
    unscheduledServiceOrders,
    schedulableForSelectedDate,
    outsideWindowForSelectedDate,
    visibleUnscheduledServiceOrderIds,
    visibleAutoScheduleSelectedServiceOrderIds: new Set(
      visibleAutoScheduleSelectedServiceOrders.map((so) => so.ServiceOrderId)
    ),
    autoScheduleAverageHoursPerDay:
      visibleAutoScheduleSelectedServiceOrders.length === 0 ||
      autoScheduleSelectedDates.length === 0
        ? null
        : autoScheduleSelectedHours / autoScheduleSelectedDates.length,
    daySummaries,
    serviceOrdersForSelectedDate:
      selectedDate === undefined ? [] : getServiceOrdersOn(selectedDate),
    physicalVisitServiceOrdersForSelectedDate:
      selectedDate === undefined ? [] : getPhysicalVisitsOn(selectedDate),
    getPhysicalVisitsOn,
    isDateSchedulable,
    isDatePickable: (date) =>
      isDatePickable(calendarMode, {
        date,
        isPast: isPast(date),
        isSchedulable: isDateSchedulable(date),
      }),
  };
}
