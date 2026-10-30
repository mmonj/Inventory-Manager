import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";

// Builders for Qt service orders in tests. Not a .test.ts file, so vitest doesn't collect it,
// and only test files import it, so it never ships.

export function makeAddress(
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

export function makeServiceOrder(options: {
  address: SurveyWorkerQtraxWebsiteTypedefsAddress;
  parentCompany?: string;
  description?: string;
  /** Start of the scheduling window. Defaults to Monday 2026-10-26. */
  windowStart?: string;
  /** Last day of the scheduling window. Defaults to Saturday 2026-10-31. */
  dueDate?: string;
  /** Defaults to "", meaning not on the calendar. */
  dateScheduled?: string;
  estimatedTime?: number;
}): SurveyWorkerQtraxWebsiteTypedefsTServiceOrder {
  const windowStart = options.windowStart ?? "2026-10-26T00:00:00";
  const dueDate = options.dueDate ?? "2026-10-31T00:00:00";
  return {
    JobId: 1,
    ServiceOrderDescription: options.description ?? "Reset aisle",
    NoVisitNecessary: false,
    DateScheduleRangeStart: windowStart,
    DateScheduleRangeEnd: dueDate,
    DateScheduled: options.dateScheduled ?? "",
    EstimatedTime: options.estimatedTime ?? 1,
    RepId: 1,
    RequiresTimeScheduling: false,
    NeedsTeamLeaderWarning: false,
    WaitForTeamLeaderToSchedule: false,
    TimeRemaingThisWeek: 0,
    Distance: 0,
    CanPrintInstructions: false,
    IsPastDue: false,
    DateScheduleRangeStartOriginal: windowStart,
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
