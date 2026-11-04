// @vitest-environment jsdom
import React from "react";

import { Context, interfaces, reverse } from "@reactivated";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@client/components/QueryProvider";
import { useRepSchedule } from "@client/hooks/qtSurveyWorker/useRepSchedule";
import { TSchedule } from "@client/util/qtSurveyWorker/scheduleUtils";
import { makeAddress, makeServiceOrder } from "@client/util/qtSurveyWorker/serviceOrderFixtures";
import { IToast, subscribeToasts } from "@client/util/toast";

const REP_A_ID = 1;
const REP_B_ID = 2;

/** A schedule reply whose only service order is described by `description`. */
function scheduleReply(repId: number, description: string): interfaces.QtViewRepDetail {
  const schedule = {
    ScheduledDates: [],
    ServiceOrders: [makeServiceOrder({ address: makeAddress({ SiteId: repId }), description })],
    AllowSchedulingDates: [],
    UnscheduledDate: "0001-01-01T00:00:00",
  } as unknown as TSchedule;

  return {
    rep_sync_data: {
      id: repId,
      rep_detail: { username: `rep${repId}` },
      schedule,
      datetime_modified: "2026-11-04T12:00:00",
    },
    is_cached: false,
    sync_error: null,
  };
}

/** A schedule reply that also carries a sync error, which the hook shows as a toast. */
function scheduleReplyWithSyncError(
  repId: number,
  description: string,
  syncError: string
): interfaces.QtViewRepDetail {
  return { ...scheduleReply(repId, description), sync_error: syncError };
}

/** Records the messages of every toast shown from now on. */
function recordToastMessages() {
  const shownToastIds = new Set<number>();
  const toastMessages: string[] = [];
  let isFirstCall = true;
  const unsubscribe = subscribeToasts((toasts: IToast[]) => {
    for (const shownToast of toasts) {
      if (!shownToastIds.has(shownToast.id)) {
        shownToastIds.add(shownToast.id);
        if (!isFirstCall) {
          toastMessages.push(...shownToast.messages);
        }
      }
    }
    isFirstCall = false;
  });
  return { toastMessages, unsubscribe };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fake server whose replies the test releases one at a time, in any order. */
function createFakeServer() {
  const pendingReplies = new Map<string, ((response: Response) => void)[]>();

  const fetchStub = vi.fn((url: string) => {
    return new Promise<Response>((resolve) => {
      pendingReplies.set(url, [...(pendingReplies.get(url) ?? []), resolve]);
    });
  });

  async function reply(url: string, body: unknown, status = 200) {
    await waitFor(() => expect(pendingReplies.get(url)?.length).toBeGreaterThan(0));
    const [resolve, ...remaining] = pendingReplies.get(url) ?? [];
    pendingReplies.set(url, remaining);
    await act(async () => {
      resolve(jsonResponse(body, status));
      await Promise.resolve();
    });
  }

  function hasPendingReply(url: string) {
    return (pendingReplies.get(url)?.length ?? 0) > 0;
  }

  return { fetchStub, reply, hasPendingReply };
}

function scheduleUrl(repId: number) {
  return reverse("survey_worker:qt_view_rep_schedule", { rep_id: repId });
}

function scheduleServiceOrderUrl(repId: number) {
  return reverse("survey_worker:qt_schedule_service_order", { rep_id: repId });
}

function quickSyncScheduleUrl(repId: number) {
  return `${scheduleUrl(repId)}?use_cache=off`;
}

function swapServiceOrdersUrl(repId: number) {
  return reverse("survey_worker:qt_swap_service_orders", { rep_id: repId });
}

function executeBulkUnscheduleUrl(repId: number) {
  return reverse("survey_worker:qt_execute_bulk_unschedule", { rep_id: repId });
}

function sentBody(fetchStub: ReturnType<typeof createFakeServer>["fetchStub"], url: string) {
  const [, sentRequest] = fetchStub.mock.calls.find(
    ([calledUrl]) => calledUrl === url
  ) as unknown as [string, RequestInit];
  return JSON.parse(sentRequest.body as string) as unknown;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const contextValue = {
    csrf_token: "test-csrf-token",
    user: { is_superuser: false },
  } as unknown as React.ContextType<typeof Context>;

  return (
    <QueryProvider>
      <Context.Provider value={contextValue}>{children}</Context.Provider>
    </QueryProvider>
  );
}

function serviceOrderDescriptions(schedule: TSchedule | null) {
  return schedule?.ServiceOrders.map((serviceOrder) => serviceOrder.ServiceOrderDescription);
}

function datesScheduled(schedule: TSchedule | null) {
  return schedule?.ServiceOrders.map((serviceOrder) => serviceOrder.DateScheduled);
}

describe("useRepSchedule", () => {
  let fakeServer: ReturnType<typeof createFakeServer>;

  beforeEach(() => {
    fakeServer = createFakeServer();
    vi.stubGlobal("fetch", fakeServer.fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function renderAndVisitRepAThenRepB() {
    const hook = renderHook(({ repId }: { repId: number | null }) => useRepSchedule(repId), {
      wrapper: Wrapper,
      initialProps: { repId: REP_A_ID },
    });
    await fakeServer.reply(scheduleUrl(REP_A_ID), scheduleReply(REP_A_ID, "Rep A reset"));
    await waitFor(() =>
      expect(serviceOrderDescriptions(hook.result.current.schedule)).toEqual(["Rep A reset"])
    );

    hook.rerender({ repId: REP_B_ID });
    await fakeServer.reply(scheduleUrl(REP_B_ID), scheduleReply(REP_B_ID, "Rep B reset"));
    await waitFor(() =>
      expect(serviceOrderDescriptions(hook.result.current.schedule)).toEqual(["Rep B reset"])
    );

    return hook;
  }

  it("shows the schedule already loaded for a rep while their refetch is in flight after switching back", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();

    rerender({ repId: REP_A_ID });

    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A reset"]);
    await waitFor(() => expect(fakeServer.hasPendingReply(scheduleUrl(REP_A_ID))).toBe(true));
    expect(result.current.isScheduleReloading).toBe(true);
    expect(result.current.isScheduleLoading).toBe(false);
  });

  it("keeps the loaded schedule and exposes the error when a refetch fails", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();

    rerender({ repId: REP_A_ID });
    await fakeServer.reply(scheduleUrl(REP_A_ID), ["Qt couldn't be reached"], 502);

    await waitFor(() =>
      expect(result.current.scheduleErrorMessages).toEqual(["Qt couldn't be reached"])
    );
    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A reset"]);
  });

  it("applies a single service order change to the rep it was sent for, after switching reps", async () => {
    const { result, rerender } = renderHook(
      ({ repId }: { repId: number | null }) => useRepSchedule(repId),
      { wrapper: Wrapper, initialProps: { repId: REP_A_ID } }
    );
    await fakeServer.reply(scheduleUrl(REP_A_ID), scheduleReply(REP_A_ID, "Rep A reset"));
    await waitFor(() => expect(result.current.schedule).not.toBeNull());
    const repAServiceOrderId = result.current.schedule?.ServiceOrders[0].ServiceOrderId ?? 0;

    act(() => {
      result.current.scheduleServiceOrder.mutate({
        repId: REP_A_ID,
        body: { service_order_id: repAServiceOrderId, date: "2026-11-10", current_date: null },
      });
    });
    await waitFor(() => expect(result.current.scheduleServiceOrder.isPending).toBe(true));

    rerender({ repId: REP_B_ID });
    await fakeServer.reply(scheduleUrl(REP_B_ID), scheduleReply(REP_B_ID, "Rep B reset"));
    await waitFor(() =>
      expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep B reset"])
    );

    await fakeServer.reply(scheduleServiceOrderUrl(REP_A_ID), {
      outcomes: [
        {
          service_order_id: repAServiceOrderId,
          outcome: "scheduled",
          target_date: "2026-11-10",
          message: "",
        },
      ],
      aborted_early: false,
    } satisfies interfaces.QtScheduleChangeReport);
    await waitFor(() => expect(result.current.scheduleServiceOrder.isSuccess).toBe(true));

    expect(datesScheduled(result.current.schedule)).toEqual([""]);
    expect(fakeServer.hasPendingReply(scheduleUrl(REP_A_ID))).toBe(false);
    const [, sentRequest] = fakeServer.fetchStub.mock.calls.find(
      ([url]) => url === scheduleServiceOrderUrl(REP_A_ID)
    ) as unknown as [string, RequestInit];
    expect(JSON.parse(sentRequest.body as string)).toEqual({
      service_order_id: repAServiceOrderId,
      date: "2026-11-10",
      current_date: null,
    });

    rerender({ repId: REP_A_ID });
    expect(datesScheduled(result.current.schedule)).toEqual(["2026-11-10T00:00:00"]);
  });

  it("keeps a single service order change when a refetch started before it replies after it", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();
    rerender({ repId: REP_A_ID });
    await waitFor(() => expect(fakeServer.hasPendingReply(scheduleUrl(REP_A_ID))).toBe(true));
    const repAServiceOrderId = result.current.schedule?.ServiceOrders[0].ServiceOrderId ?? 0;

    act(() => {
      result.current.scheduleServiceOrder.mutate({
        repId: REP_A_ID,
        body: { service_order_id: repAServiceOrderId, date: "2026-11-10", current_date: null },
      });
    });
    await fakeServer.reply(scheduleServiceOrderUrl(REP_A_ID), {
      outcomes: [
        {
          service_order_id: repAServiceOrderId,
          outcome: "scheduled",
          target_date: "2026-11-10",
          message: "",
        },
      ],
      aborted_early: false,
    } satisfies interfaces.QtScheduleChangeReport);
    await waitFor(() => expect(result.current.scheduleServiceOrder.isSuccess).toBe(true));
    await fakeServer.reply(scheduleUrl(REP_A_ID), scheduleReply(REP_A_ID, "Rep A reset"));

    await waitFor(() => expect(result.current.isScheduleReloading).toBe(false));
    expect(datesScheduled(result.current.schedule)).toEqual(["2026-11-10T00:00:00"]);
  });

  it("writes a batch schedule change's quick sync into the schedule of the rep it was sent for", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();
    const swapBody = {
      date_a: "2026-11-10",
      date_b: "2026-11-11",
      service_order_ids_a: [1],
      service_order_ids_b: [],
    } satisfies interfaces.IQtSwapServiceOrdersRequest;

    act(() => {
      result.current.swapServiceOrders.mutate({ repId: REP_A_ID, body: swapBody });
    });
    await fakeServer.reply(swapServiceOrdersUrl(REP_A_ID), {
      outcomes: [],
      aborted_early: false,
    } satisfies interfaces.QtScheduleChangeReport);

    await waitFor(() =>
      expect(fakeServer.hasPendingReply(quickSyncScheduleUrl(REP_A_ID))).toBe(true)
    );
    expect(result.current.swapServiceOrders.isPending).toBe(true);
    expect(sentBody(fakeServer.fetchStub, swapServiceOrdersUrl(REP_A_ID))).toEqual(swapBody);

    await fakeServer.reply(
      quickSyncScheduleUrl(REP_A_ID),
      scheduleReply(REP_A_ID, "Rep A swapped")
    );
    await waitFor(() => expect(result.current.swapServiceOrders.isSuccess).toBe(true));
    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep B reset"]);

    rerender({ repId: REP_A_ID });
    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A swapped"]);
  });

  it("doesn't toast about a read that a batch change's quick sync cancelled", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();
    rerender({ repId: REP_A_ID });
    await waitFor(() => expect(fakeServer.hasPendingReply(scheduleUrl(REP_A_ID))).toBe(true));
    const { toastMessages, unsubscribe } = recordToastMessages();

    act(() => {
      result.current.swapServiceOrders.mutate({
        repId: REP_A_ID,
        body: {
          date_a: "2026-11-10",
          date_b: "2026-11-11",
          service_order_ids_a: [1],
          service_order_ids_b: [],
        },
      });
    });
    await fakeServer.reply(swapServiceOrdersUrl(REP_A_ID), {
      outcomes: [],
      aborted_early: false,
    } satisfies interfaces.QtScheduleChangeReport);
    await waitFor(() =>
      expect(fakeServer.hasPendingReply(quickSyncScheduleUrl(REP_A_ID))).toBe(true)
    );
    await fakeServer.reply(
      scheduleUrl(REP_A_ID),
      scheduleReplyWithSyncError(REP_A_ID, "Rep A before swap", "Cancelled read's sync error")
    );
    await fakeServer.reply(
      quickSyncScheduleUrl(REP_A_ID),
      scheduleReplyWithSyncError(REP_A_ID, "Rep A swapped", "Quick sync's sync error")
    );
    await waitFor(() => expect(result.current.swapServiceOrders.isSuccess).toBe(true));
    unsubscribe();

    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A swapped"]);
    expect(toastMessages).toEqual(["Quick sync's sync error"]);
  });

  it("resolves a batch schedule change with its report when the quick sync fails", async () => {
    const { result } = renderHook(() => useRepSchedule(REP_A_ID), { wrapper: Wrapper });
    await fakeServer.reply(scheduleUrl(REP_A_ID), scheduleReply(REP_A_ID, "Rep A reset"));
    await waitFor(() => expect(result.current.schedule).not.toBeNull());
    const partialFailureReport = {
      outcomes: [
        { service_order_id: 1, outcome: "failed", target_date: null, message: "Rejected" },
      ],
      aborted_early: true,
    } satisfies interfaces.QtScheduleChangeReport;

    let bulkUnscheduleOneDatePromise: Promise<interfaces.QtScheduleChangeReport> | undefined;
    act(() => {
      bulkUnscheduleOneDatePromise = result.current.bulkUnscheduleOneDate.mutateAsync({
        repId: REP_A_ID,
        body: { dates: ["2026-11-10"] },
      });
    });
    await fakeServer.reply(executeBulkUnscheduleUrl(REP_A_ID), partialFailureReport);
    await fakeServer.reply(quickSyncScheduleUrl(REP_A_ID), ["Qt couldn't be reached"], 502);

    await expect(bulkUnscheduleOneDatePromise).resolves.toEqual(partialFailureReport);
    expect(sentBody(fakeServer.fetchStub, executeBulkUnscheduleUrl(REP_A_ID))).toEqual({
      dates: ["2026-11-10"],
    });
    await waitFor(() =>
      expect(result.current.scheduleErrorMessages).toEqual(["Qt couldn't be reached"])
    );
    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A reset"]);
  });
});
