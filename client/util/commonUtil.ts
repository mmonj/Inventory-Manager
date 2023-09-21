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
