import { IHttpError, TNotFoundErrorList } from "@client/types";

export function getErrorList(data: IHttpError | TNotFoundErrorList): string[] {
  if (Array.isArray(data)) {
    return data;
  } else {
    return [data.detail];
  }
}
