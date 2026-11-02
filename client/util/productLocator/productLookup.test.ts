import { describe, expect, it } from "vitest";

import { TProductLookup, createProductLookup, isAssignableLookup } from "./productLookup";

const UPC_A = "111111111111";
const UPC_B = "222222222222";

describe("isAssignableLookup", () => {
  it.each<[TProductLookup, boolean]>([
    [{ status: "idle" }, false],
    [{ status: "loading", upc: UPC_A }, false],
    [{ status: "found", upc: UPC_A, product: { upc: UPC_A } as never }, true],
    [{ status: "not-found", upc: UPC_A, errorMessages: ["Not found"] }, true],
    [{ status: "failed", upc: UPC_A, errorMessages: ["Server error"] }, false],
  ])("%o is %s", (lookup, isAssignable) => {
    expect(isAssignableLookup(lookup)).toBe(isAssignable);
  });
});

function foundReply(upc: string): Response {
  return new Response(
    JSON.stringify({ product: { upc, name: `Card ${upc}`, home_locations: [] } })
  );
}

function notFoundReply(upc: string): Response {
  return new Response(JSON.stringify({ detail: `Product with UPC ${upc} not found` }), {
    status: 404,
  });
}

function failedReply(errorMessage: string): Response {
  return new Response(JSON.stringify([errorMessage]), { status: 400 });
}

interface IPendingReply {
  resolve: (reply: Response) => void;
  reject: (error: Error) => void;
}

// Replies are resolved by hand, so a test can make them arrive in any order
function createFakeLookup() {
  const pendingReplies: IPendingReply[] = [];

  return {
    pendingReplies,
    lookUp: () =>
      new Promise<Response>((resolve, reject) => {
        pendingReplies.push({ resolve, reject });
      }),
  };
}

// A reply takes several microtasks to work through, so give an ignored one time to finish
function repliesSettled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

describe("createProductLookup", () => {
  it("starts idle", () => {
    const productLookup = createProductLookup(createFakeLookup().lookUp);

    expect(productLookup.getLookup()).toEqual({ status: "idle" });
  });

  it("is loading until the reply arrives, then found", async () => {
    const { lookUp, pendingReplies } = createFakeLookup();
    const productLookup = createProductLookup(lookUp);

    void productLookup.submitScan(UPC_A);
    expect(productLookup.getLookup()).toEqual({ status: "loading", upc: UPC_A });

    pendingReplies[0].resolve(foundReply(UPC_A));
    await repliesSettled();

    expect(productLookup.getLookup()).toMatchObject({
      status: "found",
      upc: UPC_A,
      product: { name: `Card ${UPC_A}` },
    });
  });

  it("is not found on a 404", async () => {
    const { lookUp, pendingReplies } = createFakeLookup();
    const productLookup = createProductLookup(lookUp);

    void productLookup.submitScan(UPC_A);
    pendingReplies[0].resolve(notFoundReply(UPC_A));
    await repliesSettled();

    expect(productLookup.getLookup()).toEqual({
      status: "not-found",
      upc: UPC_A,
      errorMessages: [`Product with UPC ${UPC_A} not found`],
    });
  });

  it("is failed with the server's messages on any other error status", async () => {
    const { lookUp, pendingReplies } = createFakeLookup();
    const productLookup = createProductLookup(lookUp);

    void productLookup.submitScan(UPC_A);
    pendingReplies[0].resolve(failedReply("Invalid UPC"));
    await repliesSettled();

    expect(productLookup.getLookup()).toEqual({
      status: "failed",
      upc: UPC_A,
      errorMessages: ["Invalid UPC"],
    });
  });

  it("is failed with the error's message when the request throws", async () => {
    const { lookUp, pendingReplies } = createFakeLookup();
    const productLookup = createProductLookup(lookUp);

    void productLookup.submitScan(UPC_A);
    pendingReplies[0].reject(new Error("Failed to fetch"));
    await repliesSettled();

    expect(productLookup.getLookup()).toEqual({
      status: "failed",
      upc: UPC_A,
      errorMessages: ["Failed to fetch"],
    });
  });

  describe("latest scan wins", () => {
    async function scanBothThenReply(earlierReply: Response, latestReply: Response) {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      void productLookup.submitScan(UPC_B);
      pendingReplies[1].resolve(latestReply);
      await repliesSettled();
      pendingReplies[0].resolve(earlierReply);
      await repliesSettled();

      return productLookup.getLookup();
    }

    it("ignores a late found reply after a found scan", async () => {
      const lookup = await scanBothThenReply(foundReply(UPC_A), foundReply(UPC_B));

      expect(lookup).toMatchObject({
        status: "found",
        upc: UPC_B,
        product: { name: `Card ${UPC_B}` },
      });
    });

    it("ignores a late found reply after a not found scan", async () => {
      const lookup = await scanBothThenReply(foundReply(UPC_A), notFoundReply(UPC_B));

      expect(lookup).toMatchObject({ status: "not-found", upc: UPC_B });
    });

    it("ignores a late 404 after a found scan", async () => {
      const lookup = await scanBothThenReply(notFoundReply(UPC_A), foundReply(UPC_B));

      expect(lookup).toMatchObject({ status: "found", upc: UPC_B });
    });

    it("ignores a late failure after a found scan", async () => {
      const lookup = await scanBothThenReply(failedReply("Server error"), foundReply(UPC_B));

      expect(lookup).toMatchObject({ status: "found", upc: UPC_B });
    });

    it("ignores a late request error", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      void productLookup.submitScan(UPC_B);
      pendingReplies[1].resolve(foundReply(UPC_B));
      await repliesSettled();
      pendingReplies[0].reject(new Error("Failed to fetch"));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_B });
    });

    it("stays loading when an older reply arrives before the latest one", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      void productLookup.submitScan(UPC_B);
      pendingReplies[0].resolve(foundReply(UPC_A));
      await repliesSettled();

      expect(productLookup.getLookup()).toEqual({ status: "loading", upc: UPC_B });

      pendingReplies[1].resolve(foundReply(UPC_B));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_B });
    });

    it("counts only the later request when the same UPC is rescanned", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      void productLookup.submitScan(UPC_A);
      pendingReplies[0].resolve(failedReply("Server error"));
      await repliesSettled();

      expect(productLookup.getLookup()).toEqual({ status: "loading", upc: UPC_A });

      pendingReplies[1].resolve(foundReply(UPC_A));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_A });
    });
  });

  describe("refresh", () => {
    it("retries the current UPC after a failure", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      pendingReplies[0].resolve(failedReply("Server error"));
      await repliesSettled();

      void productLookup.refresh(UPC_A);
      expect(productLookup.getLookup()).toEqual({ status: "loading", upc: UPC_A });

      pendingReplies[1].resolve(foundReply(UPC_A));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_A });
    });

    it("beats a reply that was still on its way", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      void productLookup.refresh(UPC_A);
      pendingReplies[1].resolve(foundReply(UPC_A));
      await repliesSettled();
      pendingReplies[0].resolve(failedReply("Server error"));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_A });
    });

    it("does nothing once the rep has scanned a different UPC", () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      void productLookup.submitScan(UPC_A);
      void productLookup.submitScan(UPC_B);
      void productLookup.refresh(UPC_A);

      expect(productLookup.getLookup()).toEqual({ status: "loading", upc: UPC_B });
      expect(pendingReplies).toHaveLength(2);
    });
  });

  describe("pausing scans", () => {
    it("drops a scan made while paused", () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      productLookup.pauseScans();
      void productLookup.submitScan(UPC_A);

      expect(productLookup.getLookup()).toEqual({ status: "idle" });
      expect(pendingReplies).toHaveLength(0);
    });

    it("leaves the current lookup alone when a scan is dropped", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);
      void productLookup.submitScan(UPC_A);
      pendingReplies[0].resolve(foundReply(UPC_A));
      await repliesSettled();

      productLookup.pauseScans();
      void productLookup.submitScan(UPC_B);

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_A });
    });

    it("doesn't replay a dropped scan on resume", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      productLookup.pauseScans();
      void productLookup.submitScan(UPC_A);
      productLookup.resumeScans();
      await repliesSettled();

      expect(productLookup.getLookup()).toEqual({ status: "idle" });
      expect(pendingReplies).toHaveLength(0);
    });

    it("takes scans again after resuming", () => {
      const { lookUp } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);

      productLookup.pauseScans();
      productLookup.resumeScans();
      void productLookup.submitScan(UPC_A);

      expect(productLookup.getLookup()).toEqual({ status: "loading", upc: UPC_A });
    });

    it("still runs a refresh while paused", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);
      void productLookup.submitScan(UPC_A);
      pendingReplies[0].resolve(notFoundReply(UPC_A));
      await repliesSettled();

      productLookup.pauseScans();
      void productLookup.refresh(UPC_A);
      pendingReplies[1].resolve(foundReply(UPC_A));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_A });
    });

    it("still accepts a reply that was on its way when paused", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);
      void productLookup.submitScan(UPC_A);

      productLookup.pauseScans();
      pendingReplies[0].resolve(foundReply(UPC_A));
      await repliesSettled();

      expect(productLookup.getLookup()).toMatchObject({ status: "found", upc: UPC_A });
    });
  });

  describe("subscribe", () => {
    it("notifies listeners of every change until unsubscribed", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);
      const seenStatuses: string[] = [];
      const unsubscribe = productLookup.subscribe(() => {
        seenStatuses.push(productLookup.getLookup().status);
      });

      void productLookup.submitScan(UPC_A);
      pendingReplies[0].resolve(foundReply(UPC_A));
      await repliesSettled();
      unsubscribe();
      void productLookup.submitScan(UPC_B);

      expect(seenStatuses).toEqual(["loading", "found"]);
    });

    it("doesn't notify listeners of an ignored reply", async () => {
      const { lookUp, pendingReplies } = createFakeLookup();
      const productLookup = createProductLookup(lookUp);
      void productLookup.submitScan(UPC_A);
      void productLookup.submitScan(UPC_B);
      const seenStatuses: string[] = [];
      productLookup.subscribe(() => {
        seenStatuses.push(productLookup.getLookup().status);
      });

      pendingReplies[0].resolve(foundReply(UPC_A));
      await repliesSettled();

      expect(seenStatuses).toEqual([]);
    });

    it("keeps the same lookup object between changes", () => {
      const productLookup = createProductLookup(createFakeLookup().lookUp);

      expect(productLookup.getLookup()).toBe(productLookup.getLookup());
    });
  });
});
