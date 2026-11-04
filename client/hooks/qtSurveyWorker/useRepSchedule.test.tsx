// @vitest-environment jsdom
import React from "react";

import { Context, interfaces, reverse } from "@reactivated";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@client/components/QueryProvider";
import { useRepSchedule } from "@client/hooks/qtSurveyWorker/useRepSchedule";
import { TSchedule } from "@client/util/qtSurveyWorker/scheduleUtils";
import { makeAddress, makeServiceOrder } from "@client/util/qtSurveyWorker/serviceOrderFixtures";

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
  return schedule?.ServiceOrders.map((so) => so.ServiceOrderDescription);
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

  it("shows a rep's cached schedule while their refetch is in flight after switching back", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();

    rerender({ repId: REP_A_ID });

    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A reset"]);
    await waitFor(() => expect(fakeServer.hasPendingReply(scheduleUrl(REP_A_ID))).toBe(true));
    expect(result.current.isScheduleRefreshing).toBe(true);
    expect(result.current.isScheduleLoading).toBe(false);
  });

  it("keeps the cached schedule and exposes the error when a refetch fails", async () => {
    const { result, rerender } = await renderAndVisitRepAThenRepB();

    rerender({ repId: REP_A_ID });
    await fakeServer.reply(scheduleUrl(REP_A_ID), ["Qt couldn't be reached"], 502);

    await waitFor(() =>
      expect(result.current.scheduleErrorMessages).toEqual(["Qt couldn't be reached"])
    );
    expect(serviceOrderDescriptions(result.current.schedule)).toEqual(["Rep A reset"]);
  });
});
