import { interfaces, reverse } from "@reactivated";

import { ApiPromise } from "@client/types";
import { fetchByReactivated } from "@client/util/commonUtil";

/**
 * Survey Worker's AJAX requests, one function per endpoint. Each function owns its URL, method,
 * request type and response type, and returns the unparsed response for `useFetch` or
 * `fetchJsonOrThrow`.
 */
export function createSurveyWorkerApi(csrfToken: string) {
  return {
    /**
     * `useCache` is "on" to force the stored schedule, "off" to force a sync, or null to let the
     * server's freshness window decide.
     */
    getRepSchedule(
      repId: number,
      useCache: string | null = null
    ): ApiPromise<interfaces.QtViewRepDetail> {
      const scheduleUrl = reverse("survey_worker:qt_view_rep_schedule", { rep_id: repId });
      const url =
        useCache === null
          ? scheduleUrl
          : `${scheduleUrl}?${new URLSearchParams({ use_cache: useCache }).toString()}`;

      return fetchByReactivated<interfaces.QtViewRepDetail>(url, csrfToken, "GET");
    },
  };
}
