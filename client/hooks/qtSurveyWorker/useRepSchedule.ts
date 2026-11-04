import { useContext, useEffect, useRef } from "react";

import { Context, interfaces } from "@reactivated";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiPromise } from "@client/types";
import { fetchJsonOrThrow, getErrorMessages } from "@client/util/commonUtil";
import {
  TSchedule,
  describeScheduleChangeProblems,
  withServiceOrdersRescheduled,
} from "@client/util/qtSurveyWorker/scheduleUtils";
import { createSurveyWorkerApi } from "@client/util/qtSurveyWorker/surveyWorkerApi";
import { toast } from "@client/util/toast";

const REP_SCHEDULE_QUERY_KEY = "qtRepSchedule";

function repScheduleQueryKey(repId: number) {
  return [REP_SCHEDULE_QUERY_KEY, repId];
}

/**
 * The selected field rep's schedule, cached per rep, so a slow reply for a rep the user already
 * left can't show up under another rep. Switching back to a rep shows their cached schedule while
 * a fresh copy loads, and the server's freshness window is the only freshness rule.
 */
export function useRepSchedule(repId: number | null) {
  const djangoContext = useContext(Context);
  const queryClient = useQueryClient();
  const surveyWorkerApi = createSurveyWorkerApi(djangoContext.csrf_token);

  // The rep on screen, read when a reply arrives to tell whether to toast about it
  const shownRepIdRef = useRef(repId);
  useEffect(() => {
    shownRepIdRef.current = repId;
  }, [repId]);

  async function fetchRepSchedule(requestedRepId: number, useCache: string | null) {
    const reply = await fetchJsonOrThrow(surveyWorkerApi.getRepSchedule(requestedRepId, useCache));
    if (requestedRepId === shownRepIdRef.current) {
      announceReply(reply, djangoContext.user.is_superuser);
    }
    return reply;
  }

  const repScheduleQuery = useQuery({
    queryKey: repScheduleQueryKey(repId ?? 0),
    // `enabled` below keeps this from running without a rep, so the 0 is never sent
    queryFn: () =>
      fetchRepSchedule(repId ?? 0, new URLSearchParams(window.location.search).get("use_cache")),
    enabled: repId !== null,
    staleTime: 0,
  });

  /**
   * Moves service orders in a rep's cached schedule, for a change Qt accepted and the server
   * already applied to its stored schedule. `getDate` picks the date from the cached schedule,
   * since an unscheduled service order's date is the schedule's own placeholder.
   */
  function patchRepSchedule(
    changedRepId: number,
    serviceOrderIds: Iterable<number>,
    getDate: (cachedSchedule: TSchedule) => string
  ) {
    queryClient.setQueryData<interfaces.QtViewRepDetail>(
      repScheduleQueryKey(changedRepId),
      (cachedReply) => {
        const cachedSchedule = cachedReply?.rep_sync_data.schedule;
        if (cachedReply === undefined || cachedSchedule === null || cachedSchedule === undefined) {
          return cachedReply;
        }
        return {
          ...cachedReply,
          rep_sync_data: {
            ...cachedReply.rep_sync_data,
            schedule: withServiceOrdersRescheduled(
              cachedSchedule,
              serviceOrderIds,
              getDate(cachedSchedule)
            ),
          },
        };
      }
    );
  }

  // Each change patches the schedule of the rep it was sent for, not whichever rep is on screen
  // when it finishes. A report with problems means Qt didn't make the change, so nothing moves.
  const scheduleServiceOrder = useMutation({
    mutationFn: (change: { repId: number; body: interfaces.IQtScheduleServiceOrderRequest }) =>
      fetchJsonOrThrow(surveyWorkerApi.scheduleServiceOrder(change.repId, change.body)),
    onSuccess: (report, change) => {
      if (describeScheduleChangeProblems(report) === null) {
        patchRepSchedule(
          change.repId,
          [change.body.service_order_id],
          () => `${change.body.date}T00:00:00`
        );
      }
    },
  });

  const unscheduleServiceOrder = useMutation({
    mutationFn: (change: { repId: number; body: interfaces.IQtUnscheduleServiceOrderRequest }) =>
      fetchJsonOrThrow(surveyWorkerApi.unscheduleServiceOrder(change.repId, change.body)),
    onSuccess: (report, change) => {
      if (describeScheduleChangeProblems(report) === null) {
        patchRepSchedule(
          change.repId,
          [change.body.service_order_id],
          (cachedSchedule) => cachedSchedule.UnscheduledDate
        );
      }
    },
  });

  /**
   * Reloads a rep's schedule straight from Qt after a batch change. A failed reload lands in that
   * rep's read state instead of throwing, so the change still resolves with its report.
   */
  async function reloadRepSchedule(changedRepId: number) {
    const queryKey = repScheduleQueryKey(changedRepId);
    // A read already in flight may come from the stored schedule, so it can't stand in for this one
    await queryClient.cancelQueries({ queryKey });
    try {
      await queryClient.fetchQuery({
        queryKey,
        queryFn: () => fetchRepSchedule(changedRepId, "off"),
        staleTime: 0,
      });
    } catch {
      // the error is in the query's state, where the template shows it
    }
  }

  /**
   * Sends a batch change, then reloads the schedule of the rep it was sent for, since a partial
   * change may have left service orders anywhere and Qt is the only one who knows where. The
   * mutation stays pending through the reload.
   */
  async function changeAndReload(
    changedRepId: number,
    send: () => ApiPromise<interfaces.QtScheduleChangeReport>
  ) {
    const report = await fetchJsonOrThrow(send());
    await reloadRepSchedule(changedRepId);
    return report;
  }

  const swapServiceOrders = useMutation({
    mutationFn: (change: { repId: number; body: interfaces.IQtSwapServiceOrdersRequest }) =>
      changeAndReload(change.repId, () =>
        surveyWorkerApi.swapServiceOrders(change.repId, change.body)
      ),
  });

  const executeAutoSchedule = useMutation({
    mutationFn: (change: { repId: number; body: interfaces.IQtExecuteAutoScheduleRequest }) =>
      changeAndReload(change.repId, () =>
        surveyWorkerApi.executeAutoSchedule(change.repId, change.body)
      ),
  });

  const executeBulkUnschedule = useMutation({
    mutationFn: (change: { repId: number; body: interfaces.IQtExecuteBulkUnscheduleRequest }) =>
      changeAndReload(change.repId, () =>
        surveyWorkerApi.executeBulkUnschedule(change.repId, change.body)
      ),
  });

  // A bulk unschedule of one date, with its own pending state so its button spins on its own
  const clearDate = useMutation({
    mutationFn: (change: { repId: number; body: interfaces.IQtExecuteBulkUnscheduleRequest }) =>
      changeAndReload(change.repId, () =>
        surveyWorkerApi.executeBulkUnschedule(change.repId, change.body)
      ),
  });

  const repScheduleReply = repId === null ? undefined : repScheduleQuery.data;

  return {
    schedule: repScheduleReply?.rep_sync_data.schedule ?? null,
    isScheduleLoading: repScheduleQuery.isLoading,
    isScheduleRefreshing: repScheduleQuery.isFetching && repScheduleReply !== undefined,
    isScheduleError: repId !== null && repScheduleQuery.isError,
    scheduleErrorMessages: getErrorMessages(repScheduleQuery.error),
    scheduleServiceOrder,
    unscheduleServiceOrder,
    swapServiceOrders,
    executeAutoSchedule,
    executeBulkUnschedule,
    clearDate,
  };
}

function announceReply(reply: interfaces.QtViewRepDetail, isSuperuser: boolean) {
  if (reply.sync_error !== null) {
    toast.warning(reply.sync_error);
  } else if (isSuperuser) {
    // superuser-only to cut noise for regular users, not as access control
    if (reply.is_cached) {
      toast.warning("Showing cached schedule data.");
    } else {
      toast.success("Fetched fresh schedule data.");
    }
  }
}
