import React from "react";

import { CSRFToken, reverse, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

export function Template(props: templates.QtUpdateSchedule) {
  return (
    <Layout title="Update Schedule" className="mw-rem-60 mx-auto px-2" navbar={<NavigationBar />}>
      <h1 className="text-center">Update Schedule</h1>
      <form className="mb-3" method="POST" action={reverse("survey_worker:qt_update_schedule")}>
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
          <textarea
            className="form-control"
            id="schedule-data"
            name="schedule_data"
            rows={15}
            required
          ></textarea>
        </div>

        <button type="submit" className="btn btn-primary">
          Update Schedule
        </button>
      </form>
    </Layout>
  );
}
