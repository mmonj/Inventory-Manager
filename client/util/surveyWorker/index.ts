import {
  SurveyWorkerOnehubTypedefsInterfacesIWebhubStore,
  SurveyWorkerOnehubTypedefsInterfacesOnehubModelsMvmPlan,
  interfaces,
  reverse,
} from "@reactivated";

import { differenceInHours, differenceInMinutes } from "date-fns/esm";

import { ApiPromise, ApiResponse, IHttpError, TNotFoundErrorList } from "@client/types";

import { getErrorList } from "../commonUtil";

import { THubModalController } from "./types";

export function fetchByReactivated<T>(
  url: string,
  csrfToken: string,
  method: string,
  payloadString: string
): ApiPromise<T> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
    "Content-Type": "application/json",
  };

  return fetch(url, {
    method: method,
    body: payloadString,
    headers: headers,
  });
}

export function getSurveyUrlsUpdateStatus(
  taskType: string,
  csrfToken: string,
  mvRepId: number | null
): Promise<ApiResponse<{ detail: string }>> {
  const headers = {
    "X-CSRFToken": csrfToken,
    "Content-Type": "application/json",
  };

  return fetch(reverse("survey_worker:start_task_queue"), {
    method: "POST",
    body: JSON.stringify({
      task_type: taskType,
      mv_rep_id: mvRepId,
    }),
    headers: headers,
  });
}

export function getTimeAgo(dateStr: string | null): string {
  if (dateStr === null) {
    return "Never";
  }

  const date = new Date(dateStr);
  const now = new Date();

  const hoursDifference = differenceInHours(now, date);
  const minutesDifference = differenceInMinutes(now, date) % 60; // minutes excluding hours

  if (hoursDifference > 0 && minutesDifference > 0) {
    return `${hoursDifference} hour(s) ${minutesDifference} minutes ago`;
  } else if (hoursDifference > 0) {
    return `${hoursDifference} hour(s) ago`;
  }
  return `${minutesDifference} minutes ago`;
}

export function isHasWebhubStoreNoTickets(
  store: SurveyWorkerOnehubTypedefsInterfacesIWebhubStore,
  filteredTicketIds: Set<string>
) {
  return (
    store.current_pending_mplan_ids.every((storeTicketId) =>
      filteredTicketIds.has(storeTicketId)
    ) || store.current_pending_mplan_ids.length === 0
  );
}

export function trimTicketName(input: string): string {
  const match = input.match(/(.*?)C\d\d+ \(.+?\) \(\d+\) *$/);
  if (match && match[1]) {
    return match[1].trim();
  }

  const match2 = input.match(/(.*?)\(\d+\) *$/);
  if (match2 && match2[1]) {
    return match2[1].trim();
  }

  return input;
}

export function getStoreWorktimeMinutes(
  currentPendingTicketIds: string[],
  filteredTicketIds: Set<string>,
  currentTickets: SurveyWorkerOnehubTypedefsInterfacesOnehubModelsMvmPlan[]
) {
  const thisStoreTickets: SurveyWorkerOnehubTypedefsInterfacesOnehubModelsMvmPlan[] = [];
  let totalMinutesOfWork = 0;

  currentPendingTicketIds.forEach((storeTicketId) => {
    const ticket = currentTickets.find((ticket) => ticket.ID === storeTicketId);
    if (ticket && !filteredTicketIds.has(ticket.ID)) {
      totalMinutesOfWork += parseInt(ticket.EstimatedTime);
      thisStoreTickets.push(ticket);
    }
  });

  return [totalMinutesOfWork, thisStoreTickets] as const;
}

export function getRepHubData(
  repId: number,
  dataType: string,
  csrfToken: string,
  repDataSubtype: string
): Promise<ApiResponse<interfaces.IRepSyncDataResp>> {
  const headers = {
    "X-CSRFToken": csrfToken,
    Accept: "application/json",
  };

  return fetch(
    reverse("survey_worker:get_rep_sync_data", {
      field_rep_id: repId,
      data_type: dataType,
      rep_data_subtype: repDataSubtype,
    }),
    {
      method: "GET",
      headers: headers,
    }
  );
}

export function getLoginState(
  mvRepDetailId: number,
  csrfToken: string
): ApiPromise<interfaces.IWebhubGetLoginState> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
  };

  return fetch(reverse("survey_worker:get_login_state", { mv_rep_detail_id: mvRepDetailId }), {
    headers: headers,
    method: "GET",
  });
}

export function getClockinState(
  mvRepDetailId: number,
  csrfToken: string
): ApiPromise<interfaces.IWebhubClockinStateResp> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
  };

  return fetch(reverse("survey_worker:get_clockin_state", { mv_rep_detail_id: mvRepDetailId }), {
    headers: headers,
    method: "GET",
  });
}

export function reauthenticateHubUser(
  mvRepDetailId: number,
  csrfToken: string
): ApiPromise<interfaces.IWebhubReauthenticateResp> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
  };

  return fetch(
    reverse("survey_worker:reauthenticate_hub_user", { mv_rep_detail_id: mvRepDetailId }),
    {
      headers: headers,
      method: "GET",
    }
  );
}

export function webhubClockIn(
  mvRepDetailId: number,
  latitude: number,
  longitude: number,
  csrfToken: string
): ApiPromise<interfaces.IWebHubClockInResp> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
    "Content-Type": "application/json",
  };

  const payload = {
    mv_rep_detail_id: mvRepDetailId,
    longitude: longitude,
    latitude: latitude,
  };

  return fetch(reverse("survey_worker:clock_in"), {
    headers: headers,
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function webhubClockout(mv_rep_detail_id: number, csrfToken: string): Promise<Response> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
  };

  const payload = {
    mv_rep_detail_id: mv_rep_detail_id,
  };

  return fetch(reverse("survey_worker:clock_out"), {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });
}

export function handleHubModalByFetch<T>(
  fetchCallback: () => ApiPromise<T>,
  modalContext: THubModalController,
  startingMessage: string
): Promise<void> {
  modalContext.setStatus((prev) => {
    return { ...prev, isShow: true, statusMessages: [startingMessage] };
  });

  return fetchCallback()
    .then(() => {
      modalContext.setStatus((prev) => ({ ...prev, errorMessages: [], isShow: false }));
    })
    .catch(async (errorResp: ApiResponse<IHttpError | TNotFoundErrorList | Error>) => {
      if (errorResp instanceof Error) {
        modalContext.setStatus((prev) => ({
          ...prev,
          statusMessages: [errorResp.message.slice(0, 150)],
        }));
      } else {
        const data = await (errorResp as ApiResponse<IHttpError | TNotFoundErrorList>).json();
        modalContext.setStatus((prev) => ({ ...prev, errorMessages: getErrorList(data) }));
      }

      setTimeout(() => {
        modalContext.setStatus((prev) => ({ ...prev, isShow: false }));
      }, 1000);
      throw new Error("Error state: handleContextAndFetch");
    });
}

type TUseFetch = () => Promise<
  readonly [false, ApiResponse<Error | IHttpError | TNotFoundErrorList>] | readonly [true, unknown]
>;

export function handleHubModalByUseFetchHook(
  callbackForUseFetchHook: TUseFetch,
  modalContext: THubModalController,
  startingMessage: string
): void {
  modalContext.setStatus((prev) => ({ ...prev, isShow: true, statusMessages: [startingMessage] }));
  void callbackForUseFetchHook().then(([isSuccess, result]) => {
    if (isSuccess) {
      modalContext.setStatus((prev) => ({ ...prev, isShow: false, statusMessages: [] }));
    } else {
      if (result instanceof Error) {
        modalContext.setStatus((prev) => ({ ...prev, errorMessages: [result.message] }));
      } else {
        void (result as ApiResponse<IHttpError | TNotFoundErrorList>).json().then((data) => {
          modalContext.setStatus((prev) => ({ ...prev, errorMessages: getErrorList(data) }));
        });
      }
    }
  });
}
