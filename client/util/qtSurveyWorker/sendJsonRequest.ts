import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { fetchByReactivated, getFailureMessages } from "@client/util/commonUtil";

export type TRequestResult<T> =
  { isSuccess: true; payload: T } | { isSuccess: false; errorMessages: string[] };

/** Sends a form-encoded POST (or a GET without `requestBody`) and parses its JSON reply. */
export async function sendJsonRequest<T>(
  url: string,
  csrfToken: string,
  requestBody?: URLSearchParams
): Promise<TRequestResult<T>> {
  try {
    const response =
      requestBody === undefined
        ? await fetchByReactivated<T>(url, csrfToken, "GET")
        : await fetchByReactivated<T>(
            url,
            csrfToken,
            "POST",
            requestBody,
            "application/x-www-form-urlencoded"
          );
    if (!response.ok) {
      return {
        isSuccess: false,
        errorMessages: await getFailureMessages(
          response as unknown as ApiResponse<IHttpError | TNotFoundErrorList>
        ),
      };
    }
    return { isSuccess: true, payload: await response.json() };
  } catch (error) {
    return {
      isSuccess: false,
      errorMessages: await getFailureMessages(
        error instanceof Error ? error : new Error("Unexpected error occurred")
      ),
    };
  }
}
