import { interfaces } from "@reactivated";

import { ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";
import { getFailureMessages } from "@client/util/commonUtil";

export type TProductLookup =
  | { status: "idle" }
  | { status: "loading"; upc: string }
  | { status: "found"; upc: string; product: interfaces.IProductLocations["product"] }
  | { status: "not-found"; upc: string; errorMessages: string[] }
  | { status: "failed"; upc: string; errorMessages: string[] };

export type TStartedProductLookup = Exclude<TProductLookup, { status: "idle" }>;

type TLookUpProduct = (upc: string) => Promise<ApiResponse<interfaces.IProductLocations>>;

async function resolveLookup(
  upc: string,
  lookUpProduct: TLookUpProduct
): Promise<TStartedProductLookup> {
  try {
    const reply = await lookUpProduct(upc);
    if (reply.ok) {
      const { product } = await reply.json();
      return { status: "found", upc, product };
    }

    // A 404 is the only failure that means a new UPC
    const status = reply.status === 404 ? "not-found" : "failed";
    const errorMessages = await getFailureMessages(
      reply as unknown as ApiResponse<IHttpError | TNotFoundErrorList>
    );
    return { status, upc, errorMessages };
  } catch (error) {
    return { status: "failed", upc, errorMessages: await getFailureMessages(error as Error) };
  }
}

/**
 * Resolves scanned UPCs to one Product Lookup, where only the latest scan counts. Older replies are
 * ignored rather than aborted, since lookups are read-only and letting one finish costs nothing.
 */
export function createProductLookup(lookUpProduct: TLookUpProduct) {
  let lookup: TProductLookup = { status: "idle" };
  let currentLookupId = 0;
  const listeners = new Set<() => void>();

  function setLookup(newLookup: TProductLookup): void {
    lookup = newLookup;
    listeners.forEach((listener) => listener());
  }

  async function runLookup(upc: string): Promise<void> {
    currentLookupId += 1;
    const lookupId = currentLookupId;
    setLookup({ status: "loading", upc });

    const resolvedLookup = await resolveLookup(upc, lookUpProduct);
    if (lookupId === currentLookupId) {
      setLookup(resolvedLookup);
    }
  }

  return {
    getLookup: (): TProductLookup => lookup,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    submitScan: runLookup,
    /** Re-runs the lookup for `upc`, unless the rep has since scanned a different UPC. */
    refresh: async (upc: string): Promise<void> => {
      if (lookup.status !== "idle" && lookup.upc === upc) {
        await runLookup(upc);
      }
    },
  };
}
