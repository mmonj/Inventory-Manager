import { reverse } from "@reactivated";

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
