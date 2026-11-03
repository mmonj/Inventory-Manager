import { interfaces, reverse } from "@reactivated";

import { ApiPromise } from "@client/types";
import { fetchByReactivated } from "@client/util/commonUtil";

/**
 * The Product Locator's AJAX requests, one function per endpoint. Each function owns its URL,
 * method, request type and response type, and returns the unparsed response for `useFetch` or
 * `fetchJsonOrThrow`.
 */
export function createProductLocatorApi(csrfToken: string) {
  return {
    lookUpProduct(storeId: number, upc: string): ApiPromise<interfaces.IProductLocations> {
      // reverse() doesn't encode its args, and a scanned code could hold URL special characters
      const lookupUrl = reverse("product_locator:get_product_location", {
        store_id: storeId,
        upc: encodeURIComponent(upc),
      });

      return fetchByReactivated<interfaces.IProductLocations>(lookupUrl, csrfToken, "GET");
    },

    searchProductsByName(
      storeId: number,
      query: interfaces.IGetProductLocationsByNameRequest
    ): ApiPromise<interfaces.MatchingProducts> {
      // The name goes in the query string since reverse() doesn't encode, and a path segment can't
      // hold a "/" even when encoded
      const searchParams = new URLSearchParams({ product_name: query.product_name });
      const searchUrl = reverse("product_locator:get_product_locations_by_name", {
        store_id: storeId,
      });

      return fetchByReactivated<interfaces.MatchingProducts>(
        `${searchUrl}?${searchParams.toString()}`,
        csrfToken,
        "GET"
      );
    },

    assignHomeLocation(
      { storeId, planogramId }: { storeId: number; planogramId: number },
      body: interfaces.IAddNewProductLocationRequest
    ): ApiPromise<interfaces.IHomeLocationUpdate> {
      return fetchByReactivated<
        interfaces.IHomeLocationUpdate,
        interfaces.IAddNewProductLocationRequest
      >(
        reverse("product_locator:add_new_product_location", {
          store_id: storeId,
          planogram_id: planogramId,
        }),
        csrfToken,
        "POST",
        body
      );
    },

    carryOverHomeLocations(
      { storeId, olderProductId }: { storeId: number; olderProductId: number },
      body: interfaces.ICarryOverHomeLocationsRequest
    ): ApiPromise<interfaces.IProductLocatorProduct> {
      return fetchByReactivated<
        interfaces.IProductLocatorProduct,
        interfaces.ICarryOverHomeLocationsRequest
      >(
        reverse("product_locator:carry_over_home_locations", {
          store_id: storeId,
          older_product_id: olderProductId,
        }),
        csrfToken,
        "POST",
        body
      );
    },

    createScanAudit(
      body: interfaces.ICreateNewScanAuditRequest
    ): ApiPromise<interfaces.IScanAuditCreation> {
      return fetchByReactivated<
        interfaces.IScanAuditCreation,
        interfaces.ICreateNewScanAuditRequest
      >(reverse("product_locator:create_new_scan_audit"), csrfToken, "POST", body);
    },

    addToScanAudit(
      scanAuditId: number,
      body: interfaces.IAddUpcToScanAuditRequest
    ): ApiPromise<interfaces.IProductLocatorProduct> {
      return fetchByReactivated<
        interfaces.IProductLocatorProduct,
        interfaces.IAddUpcToScanAuditRequest
      >(
        reverse("product_locator:add_upc_to_scan_audit", { scan_audit_id: scanAuditId }),
        csrfToken,
        "POST",
        body
      );
    },
  };
}
