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
