// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFetch } from "@client/hooks/useFetch";
import { ApiResponse } from "@client/types";

type TDeferredResponse<T> = {
  promise: Promise<ApiResponse<T>>;
  resolveWith: (body: T, status?: number) => void;
};

function deferredResponse<T>(): TDeferredResponse<T> {
  let resolvePromise: (response: ApiResponse<T>) => void = () => {};
  const promise = new Promise<ApiResponse<T>>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolveWith: (body, status = 200) => {
      resolvePromise(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })
      );
    },
  };
}

describe("useFetch", () => {
  it("keeps the latest call's data when an earlier call replies last", async () => {
    const { result } = renderHook(() => useFetch<{ store: string }>());
    const storeAResponse = deferredResponse<{ store: string }>();
    const storeBResponse = deferredResponse<{ store: string }>();

    let storeACall: ReturnType<typeof result.current.fetchData> | undefined;
    let storeBCall: ReturnType<typeof result.current.fetchData> | undefined;
    act(() => {
      storeACall = result.current.fetchData(() => storeAResponse.promise);
    });
    act(() => {
      storeBCall = result.current.fetchData(() => storeBResponse.promise);
    });

    await act(async () => {
      storeBResponse.resolveWith({ store: "B" });
      await storeBCall;
    });
    await act(async () => {
      storeAResponse.resolveWith({ store: "A" });
      await storeACall;
    });

    expect(result.current.data).toEqual({ store: "B" });
  });

  it("stays loading while the latest call is pending, even when an earlier call finishes", async () => {
    const { result } = renderHook(() => useFetch<{ store: string }>());
    const storeAResponse = deferredResponse<{ store: string }>();
    const storeBResponse = deferredResponse<{ store: string }>();

    let storeACall: ReturnType<typeof result.current.fetchData> | undefined;
    act(() => {
      storeACall = result.current.fetchData(() => storeAResponse.promise);
    });
    act(() => {
      void result.current.fetchData(() => storeBResponse.promise);
    });

    await act(async () => {
      storeAResponse.resolveWith({ store: "A" });
      await storeACall;
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("resolves an overtaken call with its own outcome", async () => {
    const { result } = renderHook(() => useFetch<{ store: string }>());
    const storeAResponse = deferredResponse<{ store: string }>();
    const storeBResponse = deferredResponse<{ store: string }>();

    let storeACall: ReturnType<typeof result.current.fetchData> | undefined;
    act(() => {
      storeACall = result.current.fetchData(() => storeAResponse.promise);
    });
    act(() => {
      void result.current.fetchData(() => storeBResponse.promise);
    });

    let storeAOutcome: Awaited<ReturnType<typeof result.current.fetchData>> | undefined;
    await act(async () => {
      storeAResponse.resolveWith({ store: "A" });
      storeAOutcome = await storeACall;
    });

    expect(storeAOutcome).toEqual([true, { store: "A" }]);
  });

  it("ignores an overtaken call's failure", async () => {
    const { result } = renderHook(() => useFetch<{ store: string }>());
    const storeAResponse = deferredResponse<{ store: string }>();
    const storeBResponse = deferredResponse<{ store: string }>();

    let storeACall: ReturnType<typeof result.current.fetchData> | undefined;
    let storeBCall: ReturnType<typeof result.current.fetchData> | undefined;
    act(() => {
      storeACall = result.current.fetchData(() => storeAResponse.promise);
    });
    act(() => {
      storeBCall = result.current.fetchData(() => storeBResponse.promise);
    });

    await act(async () => {
      storeBResponse.resolveWith({ store: "B" });
      await storeBCall;
    });
    let storeAOutcome: Awaited<ReturnType<typeof result.current.fetchData>> | undefined;
    await act(async () => {
      storeAResponse.resolveWith(["Store A is unavailable"] as unknown as { store: string }, 400);
      storeAOutcome = await storeACall;
    });

    expect(storeAOutcome?.[0]).toBe(false);
    expect(storeAOutcome?.[2]).toEqual(["Store A is unavailable"]);
    expect(result.current.isError).toBe(false);
    expect(result.current.errorMessages).toEqual([]);
    expect(result.current.data).toEqual({ store: "B" });
  });
});
