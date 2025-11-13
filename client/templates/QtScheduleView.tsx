import React from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";
import { JsonView, darkStyles } from "react-json-view-lite";

import { format } from "date-fns/esm";
import Form from "react-bootstrap/Form";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";
import { buildUrlFromFormData } from "@client/util/commonUtil";

import { Layout } from "../components/Layout";
import { useFetch } from "../hooks/useFetch";

export default function Template(props: templates.QtScheduleView) {
  const context = React.useContext(Context);
  const fetchRepSchedule = useFetch<interfaces.QtViewRepDetail>();

  const downloadCheckboxRef = React.useRef<HTMLInputElement>(null);
  const forceFetchCheckboxRef = React.useRef<HTMLInputElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const select = form.querySelector("select");
    const repId = Number((select as HTMLSelectElement).value);

    if (repId < 0) {
      alert("Please select a rep.");
      return;
    }

    const formData = new FormData(form);
    const baseUrl = reverse("survey_worker:qt_view_rep_schedule", { rep_id: repId });
    const fetchUrl = buildUrlFromFormData(baseUrl, formData);

    const [isSuccess, result] = await fetchRepSchedule.fetchData(() =>
      fetch(fetchUrl, {
        method: "GET",
        headers: {
          "X-CSRFToken": context.csrf_token,
          Accept: "application/json",
        },
      })
    );

    if (!isSuccess) {
      alert("Failed to fetch data.");
      return;
    }

    const downloadCheckbox = form.querySelector("#download-checkbox") as HTMLInputElement;
    if (downloadCheckbox?.checked) {
      const data = result.rep_sync_data.schedule;

      const fullUsername = result.rep_sync_data.rep_detail.username;
      const truncatedEmail = fullUsername.includes("@") ? fullUsername.split("@")[0] : fullUsername;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `schedule-data-rep-${truncatedEmail}.json`;
      link.click();
    }
  }

  return (
    <Layout
      title="Schedule Viewer"
      navbar={<NavigationBar />}
      className="mw-rem-60 mx-auto px-2"
      extraStyles={["styles/react-json-viewer.css"]}
    >
      <h1 className="my-4">Fetch Rep Schedule</h1>

      <Form onSubmit={onSubmit} className="d-flex flex-column gap-3">
        <Form.Group>
          <Form.Label>Select Rep</Form.Label>
          <Form.Select defaultValue={-1}>
            <option value={-1}>Select a rep...</option>
            {props.rep_details.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.username}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Check
          type="checkbox"
          id="force-fetch-checkbox"
          label="Fetch schedule anew"
          name="fetch_anew"
          ref={forceFetchCheckboxRef}
        />

        <Form.Check
          type="checkbox"
          id="download-checkbox"
          label="Download data as JSON"
          ref={downloadCheckboxRef}
        />

        <ButtonWithSpinner
          type="submit"
          className="btn btn-primary"
          spinnerVariant="light"
          fetchState={fetchRepSchedule}
        >
          Fetch Schedule
        </ButtonWithSpinner>
      </Form>

      {fetchRepSchedule.data && downloadCheckboxRef.current?.checked !== true && (
        <div className="mt-4">
          <h4>Schedule Data for {fetchRepSchedule.data.rep_sync_data.rep_detail.username}</h4>
          <div>
            Modified:{" "}
            {format(new Date(fetchRepSchedule.data.rep_sync_data.datetime_modified), "PPPpp")}
          </div>
          {fetchRepSchedule.data.rep_sync_data.schedule == null ? (
            <div>No data (null data) for this user</div>
          ) : (
            <JsonView
              data={fetchRepSchedule.data.rep_sync_data.schedule}
              shouldExpandNode={() => true}
              style={darkStyles}
            />
          )}
        </div>
      )}
    </Layout>
  );
}
