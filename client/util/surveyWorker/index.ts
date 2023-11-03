import {
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesSqlContentMvmPlan,
  interfaces,
  reverse,
} from "@reactivated";

import { differenceInHours, differenceInMinutes } from "date-fns/esm";

import { ApiPromise, ApiResponse } from "@client/types";

export function getSurveyUrlsUpdateStatus(
  taskType: string,
  csrfToken: string
): Promise<ApiResponse<{ detail: string }>> {
  const headers = {
    "X-CSRFToken": csrfToken,
    "Content-Type": "application/json",
  };

  return fetch(reverse("survey_worker:start_task_refresh_cmklaunch_urls"), {
    method: "POST",
    body: JSON.stringify({
      task_type: taskType,
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
  store: SurveyWorkerInterfacesIWebhubStore,
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
  currentTickets: SurveyWorkerInterfacesSqlContentMvmPlan[]
) {
  const thisStoreTickets: SurveyWorkerInterfacesSqlContentMvmPlan[] = [];
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

export function clock_in(
  mvRepDetailId: number,
  latitude: number,
  longitude: number,
  csrfToken: string
): ApiPromise<interfaces.IWebhubReauthenticateResp> {
  const headers = {
    Accept: "application/json",
    "X-CSRFToken": csrfToken,
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
