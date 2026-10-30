import { SurveyWorkerQtraxViewsTemplatesTVisitSequence, interfaces, reverse } from "@reactivated";

import { TRequestResult, sendJsonRequest } from "@client/util/qtSurveyWorker/sendJsonRequest";
import { TVisitSequenceOutcome } from "@client/util/qtSurveyWorker/territoryView";

export type TVisitSequence = SurveyWorkerQtraxViewsTemplatesTVisitSequence;

/** What an update changes: the name or the field reps, whichever the user is editing. */
export type TVisitSequenceUpdate = { name: string } | { repIds: number[] };

function toRepIdsRequestBody(repIds: number[]): URLSearchParams {
  // A lone blank rep id sends an empty rep list, which a form body can't hold otherwise
  return new URLSearchParams(
    repIds.length === 0 ? [["rep_ids", ""]] : repIds.map((repId) => ["rep_ids", repId.toString()])
  );
}

function toSiteIdsRequestBody(siteIds: number[]): URLSearchParams {
  return new URLSearchParams(siteIds.map((siteId) => ["site_ids", siteId.toString()]));
}

function toVisitSequenceResult(
  result: TRequestResult<interfaces.QtVisitSequenceDetail>
): TRequestResult<TVisitSequence> {
  return result.isSuccess ? { isSuccess: true, payload: result.payload.visit_sequence } : result;
}

export async function requestCreateVisitSequence(
  name: string,
  repIds: number[],
  csrfToken: string
): Promise<TRequestResult<TVisitSequence>> {
  const requestBody = toRepIdsRequestBody(repIds);
  requestBody.append("name", name);
  return toVisitSequenceResult(
    await sendJsonRequest<interfaces.QtVisitSequenceDetail>(
      reverse("survey_worker:qt_create_visit_sequence"),
      csrfToken,
      requestBody
    )
  );
}

/** Sends only the field being updated, so the other one is left as it is. */
export async function requestUpdateVisitSequence(
  visitSequenceId: number,
  update: TVisitSequenceUpdate,
  csrfToken: string
): Promise<TRequestResult<TVisitSequence>> {
  return toVisitSequenceResult(
    await sendJsonRequest<interfaces.QtVisitSequenceDetail>(
      reverse("survey_worker:qt_update_visit_sequence", { visit_sequence_id: visitSequenceId }),
      csrfToken,
      "name" in update
        ? new URLSearchParams({ name: update.name })
        : toRepIdsRequestBody(update.repIds)
    )
  );
}

export function requestDeleteVisitSequence(
  visitSequenceId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceDeleted>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_delete_visit_sequence", { visit_sequence_id: visitSequenceId }),
    csrfToken,
    new URLSearchParams()
  );
}

export function requestVisitSequenceOutcomes(
  visitSequenceId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceOutcomes>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_visit_sequence_outcomes", { visit_sequence_id: visitSequenceId }),
    csrfToken
  );
}

export function requestMarkStoreVisited(
  visitSequenceId: number,
  siteId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceOutcomeDetail>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_mark_store_visited", { visit_sequence_id: visitSequenceId }),
    csrfToken,
    new URLSearchParams({ site_id: siteId.toString() })
  );
}

export function requestSkipStore(
  visitSequenceId: number,
  siteId: number,
  reason: TVisitSequenceOutcome["skip_reason"],
  note: string,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceOutcomeDetail>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_skip_store", { visit_sequence_id: visitSequenceId }),
    csrfToken,
    new URLSearchParams({ site_id: siteId.toString(), reason, note })
  );
}

export function requestUndoStoreOutcome(
  visitSequenceId: number,
  siteId: number,
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceOutcomeUndone>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_undo_store_outcome", { visit_sequence_id: visitSequenceId }),
    csrfToken,
    new URLSearchParams({ site_id: siteId.toString() })
  );
}

/** Responds with the outcomes it created, leaving stores that already have one alone. */
export function requestMarkStoresVisited(
  visitSequenceId: number,
  siteIds: number[],
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceOutcomes>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_mark_stores_visited", { visit_sequence_id: visitSequenceId }),
    csrfToken,
    toSiteIdsRequestBody(siteIds)
  );
}

export function requestUndoStoreOutcomes(
  visitSequenceId: number,
  siteIds: number[],
  csrfToken: string
): Promise<TRequestResult<interfaces.QtVisitSequenceOutcomesUndone>> {
  return sendJsonRequest(
    reverse("survey_worker:qt_undo_store_outcomes", { visit_sequence_id: visitSequenceId }),
    csrfToken,
    toSiteIdsRequestBody(siteIds)
  );
}
