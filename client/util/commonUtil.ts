import { SurveyWorkerQtraxWebsiteTypedefsAddress } from "@reactivated";

import { IHttpError, TNotFoundErrorList } from "@client/types";

export function getErrorList(data: IHttpError | TNotFoundErrorList): string[] {
  if (Array.isArray(data)) {
    return data;
  } else {
    return [data.detail];
  }
}

export function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  const result = a.size === b.size && [...a].every((value) => b.has(value));
  if (result) {
    console.log(Array.from(a), "==", Array.from(b));
  }
  return result;
}

export function extractCoordinates(coordinates: string) {
  const [longitude, latitude] = coordinates.split(",").map((coord) => parseFloat(coord.trim()));
  return [longitude, latitude] as const;
}

export function setSessionStorageTimeLoaded(keyName: string) {
  sessionStorage.setItem(keyName, Date.now().toString());
}

export function isSessionLong(keyName: string, hoursThreshold: number): boolean {
  const timeLoadedMs = sessionStorage.getItem(keyName);
  if (timeLoadedMs === null) {
    return false;
  }

  return Date.now() - parseInt(timeLoadedMs) > hoursThreshold * 1000 * 60 * 60;
}

export function initSessionTimeTracker(keyName: string, hoursThreshold: number) {
  setSessionStorageTimeLoaded(keyName);
  function handleVisibilityChange() {
    if (document.visibilityState === "visible" && isSessionLong(keyName, hoursThreshold)) {
      location.reload();
    }
  }
  const eventName = "visibilitychange";
  document.addEventListener(eventName, handleVisibilityChange);

  return [eventName, handleVisibilityChange] as const;
}

export function isGreaterThanXHoursAgo(inputTimeMs: number, hours: number): boolean {
  const timeDifferenceMs = Date.now() - inputTimeMs;
  const hoursInMilliseconds = hours * 60 * 60 * 1000;

  return timeDifferenceMs > hoursInMilliseconds;
}

export function trimStr(str: string, charToTrim: string) {
  let start = 0,
    end = str.length;

  while (start < end && str[start] === charToTrim) {
    ++start;
  }

  while (end > start && str[end - 1] === charToTrim) {
    --end;
  }

  return start > 0 || end < str.length ? str.substring(start, end) : str;
}

export function buildUrlFromFormData(basePath: string, formData: FormData) {
  const url = new URL(basePath, window.location.origin);
  url.search = new URLSearchParams([...formData.entries()] as [string, string][]).toString();
  return url.toString();
}

/**
 * Formats estimated time in hours to a human-readable string.
 * If less than 1 hour, returns minutes; otherwise, returns hours and minutes.
 */
export function getFormattedEstimatedTime(estimatedtimeHours: number): string {
  if (estimatedtimeHours < 1) {
    return `${Math.floor(estimatedtimeHours * 60)} min`;
  } else {
    const hours = Math.floor(estimatedtimeHours);
    const minutes = Math.round((estimatedtimeHours - hours) * 60);
    if (minutes <= 2) {
      return `${hours} hr`;
    }

    return `${hours} hr ${minutes} min`;
  }
}

export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function reformatServiceOrderDescription(description: string): string {
  const regex = / *(C&s)? *(\dx )?C\d+b? *$/i;

  return titleCase(description.replace(regex, "")).trim();
}

export function encodeQtAddress(address: SurveyWorkerQtraxWebsiteTypedefsAddress) {
  return encodeURIComponent(
    `${address.StreetAddress} ${address.City} ${address.State} ${address.PostalCode}`
  );
}
