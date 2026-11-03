import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractCoordinates, fetchByReactivated } from "@client/util/commonUtil";

describe("extractCoordinates", () => {
  it("splits a 'longitude, latitude' string into numbers", () => {
    expect(extractCoordinates("-73.98, 40.75")).toEqual([-73.98, 40.75]);
  });
});

describe("fetchByReactivated", () => {
  const fetchStub = vi.fn((_url: string, _init?: RequestInit) =>
    Promise.resolve(new Response("{}"))
  );

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchStub);
  });

  afterEach(() => {
    fetchStub.mockClear();
    vi.unstubAllGlobals();
  });

  function sentInit(): RequestInit {
    return fetchStub.mock.calls[0][1]!;
  }

  it("sends a typed object body as JSON", async () => {
    await fetchByReactivated<unknown, { name: string }>("/x/", "csrf", "POST", { name: "a" });

    expect(sentInit().body).toBe('{"name":"a"}');
  });

  it("sends a typed array body as JSON", async () => {
    await fetchByReactivated<unknown, number[]>("/x/", "csrf", "POST", [1, 2]);

    expect(sentInit().body).toBe("[1,2]");
  });

  it("sends a typed body without a prototype as JSON", async () => {
    const body: { name: string } = Object.assign(Object.create(null) as object, { name: "a" });

    await fetchByReactivated<unknown, { name: string }>("/x/", "csrf", "POST", body);

    expect(sentInit().body).toBe('{"name":"a"}');
  });

  it("sends a typed class instance body as JSON", async () => {
    class Named {
      constructor(public name: string) {}
    }

    await fetchByReactivated<unknown, Named>("/x/", "csrf", "POST", new Named("a"));

    expect(sentInit().body).toBe('{"name":"a"}');
  });

  it("passes a ready-made string body through unchanged", async () => {
    await fetchByReactivated("/x/", "csrf", "POST", '{"already":"json"}');

    expect(sentInit().body).toBe('{"already":"json"}');
  });

  it("passes FormData and URLSearchParams bodies through unchanged", async () => {
    const formData = new FormData();
    const searchParams = new URLSearchParams({ a: "1" });

    await fetchByReactivated("/x/", "csrf", "POST", formData);
    await fetchByReactivated("/x/", "csrf", "POST", searchParams);

    expect(fetchStub.mock.calls[0][1]!.body).toBe(formData);
    expect(fetchStub.mock.calls[1][1]!.body).toBe(searchParams);
  });

  it("sends no body when none is given", async () => {
    await fetchByReactivated("/x/", "csrf", "GET");

    expect(sentInit().body).toBeUndefined();
  });

  it("rejects ready-made bodies for the typed overload at compile time", () => {
    // @ts-expect-error FormData isn't a JSON request type
    void fetchByReactivated<unknown, FormData>("/x/", "csrf", "POST", new FormData());
    // @ts-expect-error URLSearchParams isn't a JSON request type
    void fetchByReactivated<unknown, URLSearchParams>("/x/", "csrf", "POST", new URLSearchParams());
    // @ts-expect-error Blob isn't a JSON request type
    void fetchByReactivated<unknown, Blob>("/x/", "csrf", "POST", new Blob());
  });
});
