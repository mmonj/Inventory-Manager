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
