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
import { TUseCache, createSurveyWorkerApi } from "@client/util/qtSurveyWorker/surveyWorkerApi";
import { toast } from "@client/util/toast";

const REP_SCHEDULE_QUERY_KEY = "qtRepSchedule";

function repScheduleQueryKey(repId: number) {
  return [REP_SCHEDULE_QUERY_KEY, repId];
}

/** A schedule change's variables: the rep it's sent for, and the body sent to that rep's endpoint. */
export type TRepScheduleChange<TBody> = { repId: number; body: TBody };

/** The page's `use_cache` query parameter, ignored unless it's one the server understands. */
function getUseCacheFromUrl(): TUseCache {
  const useCache = new URLSearchParams(window.location.search).get("use_cache");
  return useCache === "on" || useCache === "off" ? useCache : null;
}

/**
 * The selected field rep's schedule, kept per rep, so a slow reply for a rep the user already
 * left can't show up under another rep. Switching back to a rep shows the schedule already loaded
 * for them while a newer copy loads, and the server's freshness window is the only freshness rule.
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

  // A cancelled read's reply never reaches the query's data, so it gets no toast
  async function fetchRepSchedule(
    requestedRepId: number,
    useCache: TUseCache,
    signal: AbortSignal
  ) {
    const reply = await fetchJsonOrThrow(surveyWorkerApi.getRepSchedule(requestedRepId, useCache));
    if (!signal.aborted && requestedRepId === shownRepIdRef.current) {
      announceReply(reply, djangoContext.user.is_superuser);
    }
    return reply;
  }

  const repScheduleQuery = useQuery({
    queryKey: repScheduleQueryKey(repId ?? 0),
    // `enabled` below keeps this from running without a rep, so the 0 is never sent
    queryFn: ({ signal }) => fetchRepSchedule(repId ?? 0, getUseCacheFromUrl(), signal),
    enabled: repId !== null,
    staleTime: 0,
  });

  /**
   * Moves service orders in the schedule already loaded for a rep, for a change Qt accepted and
   * the server already applied to its stored schedule. `getDate` picks the date from the loaded
   * schedule, since an unscheduled service order's date is the schedule's own placeholder.
   */
  async function patchRepSchedule(
    changedRepId: number,
    serviceOrderIds: Iterable<number>,
    getDate: (loadedSchedule: TSchedule) => string
  ) {
    // A read already in flight may reply with the schedule from before the change, so it can't
    // be allowed to land over the patch
    await queryClient.cancelQueries({ queryKey: repScheduleQueryKey(changedRepId) });
    queryClient.setQueryData<interfaces.QtViewRepDetail>(
      repScheduleQueryKey(changedRepId),
      (loadedReply) => {
        const loadedSchedule = loadedReply?.rep_sync_data.schedule;
        if (loadedReply === undefined || loadedSchedule === null || loadedSchedule === undefined) {
          return loadedReply;
        }
        return {
          ...loadedReply,
          rep_sync_data: {
            ...loadedReply.rep_sync_data,
            schedule: withServiceOrdersRescheduled(
              loadedSchedule,
              serviceOrderIds,
              getDate(loadedSchedule)
            ),
          },
        };
      }
    );
  }

  // Each change patches the schedule of the rep it was sent for, not whichever rep is on screen
  // when it finishes. A report with problems means Qt didn't make the change, so nothing moves.
  const scheduleServiceOrder = useMutation({
    mutationFn: (change: TRepScheduleChange<interfaces.IQtScheduleServiceOrderRequest>) =>
      fetchJsonOrThrow(surveyWorkerApi.scheduleServiceOrder(change.repId, change.body)),
    onSuccess: async (report, change) => {
      if (describeScheduleChangeProblems(report) === null) {
        await patchRepSchedule(
          change.repId,
          [change.body.service_order_id],
          () => `${change.body.date}T00:00:00`
        );
      }
    },
  });

  const unscheduleServiceOrder = useMutation({
    mutationFn: (change: TRepScheduleChange<interfaces.IQtUnscheduleServiceOrderRequest>) =>
      fetchJsonOrThrow(surveyWorkerApi.unscheduleServiceOrder(change.repId, change.body)),
    onSuccess: async (report, change) => {
      if (describeScheduleChangeProblems(report) === null) {
        await patchRepSchedule(
          change.repId,
          [change.body.service_order_id],
          (loadedSchedule) => loadedSchedule.UnscheduledDate
        );
      }
    },
  });

  /**
   * Gets a rep's schedule through a Qt quick sync after a batch change. A failed quick sync lands
   * in that rep's read state instead of throwing, so the change still resolves with its report.
   */
  async function quickSyncRepSchedule(changedRepId: number) {
    const queryKey = repScheduleQueryKey(changedRepId);
    // A read already in flight may come from the stored schedule, so it can't stand in for this one
    await queryClient.cancelQueries({ queryKey });
    try {
      await queryClient.fetchQuery({
        queryKey,
        queryFn: ({ signal }) => fetchRepSchedule(changedRepId, "off", signal),
        staleTime: 0,
      });
    } catch {
      // the error is in the query's state, where the template shows it
    }
  }

  /**
   * Sends a batch change, then quick-syncs the schedule of the rep it was sent for, since a
   * partial change may have left service orders anywhere and Qt is the only one who knows where.
   * The mutation stays pending through the quick sync.
   */
  async function changeAndQuickSync(
    changedRepId: number,
    send: () => ApiPromise<interfaces.QtScheduleChangeReport>
  ) {
    const report = await fetchJsonOrThrow(send());
    await quickSyncRepSchedule(changedRepId);
    return report;
  }

  function bulkUnscheduleMutationOptions() {
    return {
      mutationFn: (change: TRepScheduleChange<interfaces.IQtExecuteBulkUnscheduleRequest>) =>
        changeAndQuickSync(change.repId, () =>
          surveyWorkerApi.executeBulkUnschedule(change.repId, change.body)
        ),
    };
  }

  const swapServiceOrders = useMutation({
    mutationFn: (change: TRepScheduleChange<interfaces.IQtSwapServiceOrdersRequest>) =>
      changeAndQuickSync(change.repId, () =>
        surveyWorkerApi.swapServiceOrders(change.repId, change.body)
      ),
  });

  const executeAutoSchedule = useMutation({
    mutationFn: (change: TRepScheduleChange<interfaces.IQtExecuteAutoScheduleRequest>) =>
      changeAndQuickSync(change.repId, () =>
        surveyWorkerApi.executeAutoSchedule(change.repId, change.body)
      ),
  });

  const executeBulkUnschedule = useMutation(bulkUnscheduleMutationOptions());

  // The same bulk unschedule, used for one date, with its own pending state so its button spins
  // on its own
  const bulkUnscheduleOneDate = useMutation(bulkUnscheduleMutationOptions());

  const repScheduleReply = repId === null ? undefined : repScheduleQuery.data;

  return {
    schedule: repScheduleReply?.rep_sync_data.schedule ?? null,
    isScheduleLoading: repScheduleQuery.isLoading,
    // A newer copy is loading for a rep whose schedule is already shown
    isScheduleReloading: repScheduleQuery.isFetching && repScheduleReply !== undefined,
    isScheduleError: repId !== null && repScheduleQuery.isError,
    scheduleErrorMessages: getErrorMessages(repScheduleQuery.error),
    scheduleServiceOrder,
    unscheduleServiceOrder,
    swapServiceOrders,
    executeAutoSchedule,
    executeBulkUnschedule,
    bulkUnscheduleOneDate,
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
