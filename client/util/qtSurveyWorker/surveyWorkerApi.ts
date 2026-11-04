import { interfaces, reverse } from "@reactivated";

import { ApiPromise } from "@client/types";
import { fetchByReactivated } from "@client/util/commonUtil";

/**
 * "on" forces the stored schedule, "off" forces a Qt quick sync, and null lets the server's
 * freshness window decide.
 */
export type TUseCache = "on" | "off" | null;

/**
 * Survey Worker's AJAX requests, one function per endpoint. Each function owns its URL, method,
 * request type and response type, and returns the unparsed response for `useFetch` or
 * `fetchJsonOrThrow`.
 */
export function createSurveyWorkerApi(csrfToken: string) {
  return {
    getRepSchedule(
      repId: number,
      useCache: TUseCache = null
    ): ApiPromise<interfaces.QtViewRepDetail> {
      const scheduleUrl = reverse("survey_worker:qt_view_rep_schedule", { rep_id: repId });
      const url =
        useCache === null
          ? scheduleUrl
          : `${scheduleUrl}?${new URLSearchParams({ use_cache: useCache }).toString()}`;

      return fetchByReactivated<interfaces.QtViewRepDetail>(url, csrfToken, "GET");
    },

    scheduleServiceOrder(
      repId: number,
      body: interfaces.IQtScheduleServiceOrderRequest
    ): ApiPromise<interfaces.QtScheduleChangeReport> {
      return fetchByReactivated<
        interfaces.QtScheduleChangeReport,
        interfaces.IQtScheduleServiceOrderRequest
      >(
        reverse("survey_worker:qt_schedule_service_order", { rep_id: repId }),
        csrfToken,
        "POST",
        body
      );
    },

    unscheduleServiceOrder(
      repId: number,
      body: interfaces.IQtUnscheduleServiceOrderRequest
    ): ApiPromise<interfaces.QtScheduleChangeReport> {
      return fetchByReactivated<
        interfaces.QtScheduleChangeReport,
        interfaces.IQtUnscheduleServiceOrderRequest
      >(
        reverse("survey_worker:qt_unschedule_service_order", { rep_id: repId }),
        csrfToken,
        "POST",
        body
      );
    },

    swapServiceOrders(
      repId: number,
      body: interfaces.IQtSwapServiceOrdersRequest
    ): ApiPromise<interfaces.QtScheduleChangeReport> {
      return fetchByReactivated<
        interfaces.QtScheduleChangeReport,
        interfaces.IQtSwapServiceOrdersRequest
      >(
        reverse("survey_worker:qt_swap_service_orders", { rep_id: repId }),
        csrfToken,
        "POST",
        body
      );
    },

    executeAutoSchedule(
      repId: number,
      body: interfaces.IQtExecuteAutoScheduleRequest
    ): ApiPromise<interfaces.QtScheduleChangeReport> {
      return fetchByReactivated<
        interfaces.QtScheduleChangeReport,
        interfaces.IQtExecuteAutoScheduleRequest
      >(
        reverse("survey_worker:qt_execute_auto_schedule", { rep_id: repId }),
        csrfToken,
        "POST",
        body
      );
    },

    executeBulkUnschedule(
      repId: number,
      body: interfaces.IQtExecuteBulkUnscheduleRequest
    ): ApiPromise<interfaces.QtScheduleChangeReport> {
      return fetchByReactivated<
        interfaces.QtScheduleChangeReport,
        interfaces.IQtExecuteBulkUnscheduleRequest
      >(
        reverse("survey_worker:qt_execute_bulk_unschedule", { rep_id: repId }),
        csrfToken,
        "POST",
        body
      );
    },
  };
}
