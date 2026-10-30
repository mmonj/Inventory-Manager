import { SurveyWorkerQtraxViewsTemplatesTVisitPlan, interfaces, reverse } from "@reactivated";

import { TRequestResult, sendJsonRequest } from "@client/util/qtSurveyWorker/sendJsonRequest";
import { TVisitPlanOutcome } from "@client/util/qtSurveyWorker/territoryView";

export type TVisitPlan = SurveyWorkerQtraxViewsTemplatesTVisitPlan;

/** What an update changes: the name or the field reps, whichever the user is editing. */
export type TVisitPlanUpdate = { name: string } | { repIds: number[] };

function toRepIdsRequestBody(repIds: number[]): URLSearchParams {
  // A lone blank rep id sends an empty rep list, which a form body can't hold otherwise
  return new URLSearchParams(
    repIds.length === 0 ? [["rep_ids", ""]] : repIds.map((repId) => ["rep_ids", repId.toString()])
  );
}

function toSiteIdsRequestBody(siteIds: number[]): URLSearchParams {
  return new URLSearchParams(siteIds.map((siteId) => ["site_ids", siteId.toString()]));
}

function toVisitPlanResult(
  result: TRequestResult<interfaces.QtVisitPlanDetail>
): TRequestResult<TVisitPlan> {
  return result.isSuccess ? { isSuccess: true, payload: result.payload.visit_plan } : result;
}

export async function requestCreateVisitPlan(
  name: string,
  repIds: number[],
  csrfToken: string
): Promise<TRequestResult<TVisitPlan>> {
  const requestBody = toRepIdsRequestBody(repIds);
  requestBody.append("name", name);
  return toVisitPlanResult(
    await sendJsonRequest<interfaces.QtVisitPlanDetail>(
      reverse("survey_worker:qt_create_visit_plan"),
      csrfToken,
      requestBody
    )
  );
}

/** Sends only the field being updated, so the other one is left as it is. */
export async function requestUpdateVisitPlan(
  visitPlanId: number,
  update: TVisitPlanUpdate,
  csrfToken: string
): Promise<TRequestResult<TVisitPlan>> {
  return toVisitPlanResult(
    await sendJsonRequest<interfaces.QtVisitPlanDetail>(
      reverse("survey_worker:qt_update_visit_plan", { visit_plan_id: visitPlanId }),
      csrfToken,
      "name" in update
        ? new URLSearchParams({ name: update.name })
        : toRepIdsRequestBody(update.repIds)
    )
  );
}

export function requestDeleteVisitPlan(
  visitPlanId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanDeleted>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_delete_visit_plan", { visit_plan_id: visitPlanId }),
    csrfToken,
    new URLSearchParams()
  );
}

export function requestVisitPlanOutcomes(
  visitPlanId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanOutcomes>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_visit_plan_outcomes", { visit_plan_id: visitPlanId }),
    csrfToken
  );
}

export function requestMarkStoreVisited(
  visitPlanId: number,
  siteId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanOutcomeDetail>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_mark_store_visited", { visit_plan_id: visitPlanId }),
    csrfToken,
    new URLSearchParams({ site_id: siteId.toString() })
  );
}

export function requestSkipStore(
  visitPlanId: number,
  siteId: number,
  reason: TVisitPlanOutcome["skip_reason"],
  note: string,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanOutcomeDetail>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_skip_store", { visit_plan_id: visitPlanId }),
    csrfToken,
    new URLSearchParams({ site_id: siteId.toString(), reason, note })
  );
}

export function requestUndoStoreOutcome(
  visitPlanId: number,
  siteId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanOutcomeUndone>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_undo_store_outcome", { visit_plan_id: visitPlanId }),
    csrfToken,
    new URLSearchParams({ site_id: siteId.toString() })
  );
}

/** Responds with the outcomes it created, leaving stores that already have one alone. */
export function requestMarkStoresVisited(
  visitPlanId: number,
  siteIds: number[],
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanOutcomes>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_mark_stores_visited", { visit_plan_id: visitPlanId }),
    csrfToken,
    toSiteIdsRequestBody(siteIds)
  );
}

export function requestUndoStoreOutcomes(
  visitPlanId: number,
  siteIds: number[],
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitPlanOutcomesUndone>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_undo_store_outcomes", { visit_plan_id: visitPlanId }),
    csrfToken,
    toSiteIdsRequestBody(siteIds)
  );
}
