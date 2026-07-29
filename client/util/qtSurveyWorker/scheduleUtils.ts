import { interfaces } from "@reactivated";

export type TSchedule = NonNullable<interfaces.QtViewRepDetail["rep_sync_data"]["schedule"]>;
export type TServiceOrder = TSchedule["ServiceOrders"][number];

export const UNSCHEDULED_ORDER_BY_OPTIONS = ["Location", "Start Date", "Due Date"] as const;
export type TUnscheduledOrderBy = (typeof UNSCHEDULED_ORDER_BY_OPTIONS)[number];

/** Formats a job duration in minutes as e.g. "45 min" or "1.5 hrs". */
export function formatJobTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hr${parseFloat(hours) !== 1 ? "s" : ""}`;
}

/** Formats an ISO date pair as a short range, e.g. "Jul 29 - Aug 8". */
export function formatDateRange(start: string, end: string): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startDate = new Date(start).toLocaleDateString(undefined, options);
  const endDate = new Date(end).toLocaleDateString(undefined, options);
  return `${startDate} - ${endDate}`;
}

/** Formats hours as an integer when whole, otherwise to 2 decimal places (e.g. 3 or 3.25). */
export function formatTotalHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(2);
}

/** Formats a Date as a "YYYY-MM-DD" key, e.g. for grouping/lookup by calendar day. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Formats a Date as "M/D", e.g. "7/29". */
export function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Formats a Date as "Wed, 07/29" for display in headers. */
export function formatWeekdayShortDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${weekday}, ${month}/${day}`;
}

/** Formats a service order's scheduling window as a short date range, e.g. "7/29 - 8/8". */
export function formatWindow(so: TServiceOrder): string {
  const start = formatShortDate(new Date(so.DateScheduleRangeStart));
  const end = formatShortDate(new Date(so.DateScheduleRangeEnd));
  return `${start} - ${end}`;
}

/**
 * Builds a string sort key that clusters service orders by store location
 * (physical-visit flag, then lat/lng), so adjacent list items belong to the
 * same store. Job description and range-end are appended only to break ties
 * within a store.
 */
export function getStoreGroupKey(so: TServiceOrder): string {
  return `Physical Visit: ${so.Address.IsPhysicalVisit.toString()} ${so.Address.Latitude} ${
    so.Address.Longitude
  } ${so.ServiceOrderDescription} ${so.DateScheduleRangeEnd}`;
}

/** Sorts service orders so entries at the same store are grouped adjacently. */
export function groupByStore(serviceOrders: TServiceOrder[]): TServiceOrder[] {
  return [...serviceOrders].sort((a, b) => getStoreGroupKey(a).localeCompare(getStoreGroupKey(b)));
}

/** Sort key for "Start Date" ordering: range-start date first, store location as tiebreaker. */
function getStartDateSortKey(so: TServiceOrder): string {
  return `${so.DateScheduleRangeStart} ${getStoreGroupKey(so)}`;
}

/** Sort key for "Due Date" ordering: range-end date first, store location as tiebreaker. */
function getDueDateSortKey(so: TServiceOrder): string {
  return `${so.DateScheduleRangeEnd} ${getStoreGroupKey(so)}`;
}

/**
 * Sorts service orders per the selected "Order By" option (Location, Start
 * Date, or Due Date). Start Date/Due Date sorts fall back to store-location
 * grouping to break ties between orders sharing the same date.
 */
export function sortServiceOrdersBy(
  serviceOrders: TServiceOrder[],
  orderBy: TUnscheduledOrderBy
): TServiceOrder[] {
  const sortKeyGettersByOrder: Record<TUnscheduledOrderBy, (so: TServiceOrder) => string> = {
    Location: getStoreGroupKey,
    "Start Date": getStartDateSortKey,
    "Due Date": getDueDateSortKey,
  };
  const getSortKey = sortKeyGettersByOrder[orderBy];

  return [...serviceOrders].sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
}
