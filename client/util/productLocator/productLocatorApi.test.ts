import { reverse } from "@reactivated";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProductLocatorApi } from "./productLocatorApi";

const STORE_ID = 7;

const fetchStub = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response("{}")));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchStub);
});

afterEach(() => {
  fetchStub.mockClear();
  vi.unstubAllGlobals();
});

function requestedUrl(): URL {
  return new URL(fetchStub.mock.calls[0][0], "http://localhost");
}

describe("lookUpProduct", () => {
  it.each(["12/34", "12%34", "12?34", "12#34", "a/b?c#d%e"])(
    "puts the scanned code %s into a single path segment",
    async (upc) => {
      const productLocatorApi = createProductLocatorApi("csrf-token");

      await productLocatorApi.lookUpProduct(STORE_ID, upc);

      const lookupUrl = requestedUrl();
      const pathSegments = lookupUrl.pathname.split("/").filter(Boolean);
      expect(pathSegments.slice(0, -1)).toEqual(
        reverse("product_locator:get_product_location", { store_id: STORE_ID, upc: "x" })
          .split("/")
          .filter(Boolean)
          .slice(0, -1)
      );
      expect(decodeURIComponent(pathSegments.at(-1)!)).toBe(upc);
      expect(lookupUrl.search).toBe("");
      expect(lookupUrl.hash).toBe("");
    }
  );
});

describe("searchProductsByName", () => {
  it.each(["Birthday Card", "Mom & Dad", "Why?", "Card #5", "A & B? #1 / 50%"])(
    "sends the name %s whole",
    async (productName) => {
      const productLocatorApi = createProductLocatorApi("csrf-token");

      await productLocatorApi.searchProductsByName(STORE_ID, { product_name: productName });

      const searchUrl = requestedUrl();
      expect(searchUrl.pathname).toBe(
        reverse("product_locator:get_product_locations_by_name", { store_id: STORE_ID })
      );
      expect([...searchUrl.searchParams.entries()]).toEqual([["product_name", productName]]);
      expect(searchUrl.hash).toBe("");
    }
  );
});
