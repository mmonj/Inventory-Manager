import { useContext, useEffect, useRef } from "react";

import { Context, interfaces } from "@reactivated";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJsonOrThrow, getErrorMessages } from "@client/util/commonUtil";
import { withServiceOrdersRescheduled } from "@client/util/qtSurveyWorker/scheduleUtils";
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
   * Interim, until single service order changes move into this hook: moves service orders in a
   * rep's cached schedule, for a change Qt accepted and the server already stored.
   */
  function patchRepSchedule(
    changedRepId: number,
    serviceOrderIds: Iterable<number>,
    date: Date | string
  ) {
    queryClient.setQueryData<interfaces.QtViewRepDetail>(
      repScheduleQueryKey(changedRepId),
      (cachedReply) =>
        cachedReply && {
          ...cachedReply,
          rep_sync_data: {
            ...cachedReply.rep_sync_data,
            schedule: withServiceOrdersRescheduled(
              cachedReply.rep_sync_data.schedule,
              serviceOrderIds,
              date
            ),
          },
        }
    );
  }

  /**
   * Interim, until batch schedule changes move into this hook: reloads a rep's schedule straight
   * from Qt after a change. A failed reload lands in that rep's read state instead of throwing.
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

  const repScheduleReply = repId === null ? undefined : repScheduleQuery.data;

  return {
    schedule: repScheduleReply?.rep_sync_data.schedule ?? null,
    isScheduleLoading: repScheduleQuery.isLoading,
    isScheduleRefreshing: repScheduleQuery.isFetching && repScheduleReply !== undefined,
    isScheduleError: repId !== null && repScheduleQuery.isError,
    scheduleErrorMessages: getErrorMessages(repScheduleQuery.error),
    patchRepSchedule,
    reloadRepSchedule,
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
