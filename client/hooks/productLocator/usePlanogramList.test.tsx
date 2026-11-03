// @vitest-environment jsdom
import React from "react";

import { Context, interfaces, reverse } from "@reactivated";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueryProvider } from "@client/components/QueryProvider";
import { usePlanogramList } from "@client/hooks/productLocator/usePlanogramList";

type TStorePlanogram = interfaces.IPlanogramsByStore["planograms"][number];

const STORE_A_ID = 1;
const STORE_B_ID = 2;

function storePlanogram(pk: number, name: string): TStorePlanogram {
  return {
    planogram: {
      pk,
      name,
      date_start: "2026-01-01",
      date_end: null,
      is_outdated: false,
      plano_type_info: { value: "regular", label: "Regular Planogram" },
    },
    product_count: 0,
    has_pending_update: false,
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

  return { fetchStub, reply };
}

function planogramsUrl(storeId: number) {
  return reverse("product_locator:get_planograms_by_store", { store_id: storeId });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const contextValue = { csrf_token: "test-csrf-token" } as unknown as React.ContextType<
    typeof Context
  >;

  return (
    <QueryProvider>
      <Context.Provider value={contextValue}>{children}</Context.Provider>
    </QueryProvider>
  );
}

function planogramNames(planograms: TStorePlanogram[] | undefined) {
  return planograms?.map(({ planogram }) => planogram.name);
}

describe("usePlanogramList", () => {
  let fakeServer: ReturnType<typeof createFakeServer>;

  beforeEach(() => {
    fakeServer = createFakeServer();
    vi.stubGlobal("fetch", fakeServer.fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the selected store's planograms when an earlier store replies last", async () => {
    const { result, rerender } = renderHook(
      ({ storeId }: { storeId: number | null }) => usePlanogramList(storeId),
      { wrapper: Wrapper, initialProps: { storeId: STORE_A_ID } }
    );
    rerender({ storeId: STORE_B_ID });

    await fakeServer.reply(planogramsUrl(STORE_B_ID), {
      planograms: [storePlanogram(20, "Store B Cards")],
    });
    await fakeServer.reply(planogramsUrl(STORE_A_ID), {
      planograms: [storePlanogram(10, "Store A Cards")],
    });

    await waitFor(() =>
      expect(planogramNames(result.current.planograms)).toEqual(["Store B Cards"])
    );
  });

  it("refreshes the selected store's planograms after a delete started in another store", async () => {
    const { result, rerender } = renderHook(
      ({ storeId }: { storeId: number | null }) => usePlanogramList(storeId),
      { wrapper: Wrapper, initialProps: { storeId: STORE_A_ID } }
    );
    await fakeServer.reply(planogramsUrl(STORE_A_ID), {
      planograms: [storePlanogram(10, "Store A Cards")],
    });

    let deleteCall: Promise<unknown> | undefined;
    act(() => {
      deleteCall = result.current.deletePlanogram.mutateAsync(10);
    });
    rerender({ storeId: STORE_B_ID });
    await fakeServer.reply(planogramsUrl(STORE_B_ID), {
      planograms: [storePlanogram(20, "Store B Cards")],
    });

    await fakeServer.reply(reverse("product_locator:delete_planogram", { planogram_id: 10 }), {
      success: true,
    });
    await fakeServer.reply(planogramsUrl(STORE_B_ID), {
      planograms: [storePlanogram(20, "Store B Cards"), storePlanogram(21, "Store B Gift Wrap")],
    });
    await act(async () => {
      await deleteCall;
    });

    await waitFor(() =>
      expect(planogramNames(result.current.planograms)).toEqual([
        "Store B Cards",
        "Store B Gift Wrap",
      ])
    );
  });

  it("reports the server's messages when the list fails to load", async () => {
    const { result } = renderHook(() => usePlanogramList(STORE_A_ID), { wrapper: Wrapper });

    await fakeServer.reply(planogramsUrl(STORE_A_ID), ["Store not found"], 404);

    await waitFor(() => expect(result.current.listErrorMessages).toEqual(["Store not found"]));
  });
});
