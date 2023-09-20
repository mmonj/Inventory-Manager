import { reverse } from "@reactivated";

import { differenceInHours, differenceInMinutes } from "date-fns/esm";

import { ApiResponse } from "@client/types";

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
