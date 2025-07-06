import React from "react";

import { CSRFToken, reverse, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

export function Template(props: templates.QtUpdateSchedule) {
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const textareaValue = (
      form.elements.namedItem("schedule_data") as HTMLTextAreaElement
    ).value.trim();
    const fileInput = form.elements.namedItem("schedule_data_json") as HTMLInputElement;
    const hasFile = fileInput.files !== null && fileInput.files.length > 0;
    const hasText = textareaValue !== "";

    if ((!hasText && !hasFile) || (hasText && hasFile)) {
      setErrorMsg(
        "Please provide schedule data. Fill either the text area or upload a JSON file, but not both."
      );
      event.preventDefault();
      return;
    }

    setErrorMsg("");
  }

  return (
    <Layout title="Update Schedule" className="mw-rem-60 mx-auto px-2" navbar={<NavigationBar />}>
      <h1 className="text-center">Update Schedule</h1>
      <form
        onSubmit={handleFormSubmit}
        className="mb-3"
        method="POST"
        encType="multipart/form-data"
        action={reverse("survey_worker:qt_update_schedule")}
      >
        <CSRFToken />
        <div className="mb-3">
          <select className="form-select" name="rep_id" required>
            <option value="" selected disabled>
              Select Rep
            </option>
            {props.reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.username}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label htmlFor="schedule-data" className="form-label">
            Schedule Data
          </label>
          {errorMsg && <div className="alert alert-danger p-2">{errorMsg}</div>}
          <input
            type="file"
            className="form-control my-2"
            id="schedule-data-json"
            name="schedule_data_json"
          />
          <textarea
            className="form-control"
            id="schedule-data"
            name="schedule_data"
            rows={15}
          ></textarea>
        </div>

        <button type="submit" className="btn btn-primary">
          Update Schedule
        </button>
      </form>
    </Layout>
  );
}
