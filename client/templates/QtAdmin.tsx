// client/templates/QtAdmin.tsx
import React from "react";

import { Context, interfaces, reverse, templates } from "@reactivated";

import Form from "react-bootstrap/Form";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";

import { Layout } from "../components/Layout";
import { useFetch } from "../hooks/useFetch";

export function Template(props: templates.QtAdmin) {
  const context = React.useContext(Context);
  const forceFetchSession = useFetch<interfaces.QtLoginSessionRefetch>();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const select = form.querySelector("select");
    const repId = Number((select as HTMLSelectElement).value);

    if (repId < 0) {
      alert("Please select a valid rep.");
      return;
    }

    const [isSuccess, result] = await forceFetchSession.fetchData(() =>
      fetch(
        reverse("survey_worker:qt_force_fetch_login_session", {
          rep_id: repId,
        }),
        {
          method: "POST",
          headers: {
            "X-CSRFToken": context.csrf_token,
            Accept: "application/json",
          },
        }
      )
    );

    if (isSuccess) {
      alert(result.message);
    } else {
      alert("Failed to fetch session.");
    }
  }

  return (
    <Layout
      title="Admin Panel"
      navbar={<NavigationBar />}
      className="mw-rem-60 mx-auto px-2"
    >
      <h1 className="my-4">Force Fetch Login Session</h1>

      <Form className="d-flex flex-column gap-3" onSubmit={onSubmit}>
        <Form.Group controlId="repSelect">
          <Form.Label>Select Rep</Form.Label>
          <Form.Select defaultValue={-1}>
            <option value={-1}>Select a rep...</option>
            <option value={0}>All Reps</option>
            {props.reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.username}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <ButtonWithSpinner
          type="submit"
          spinnerVariant="light"
          className="btn btn-primary"
          fetchState={forceFetchSession}
        >
          Force Fetch Session
        </ButtonWithSpinner>
      </Form>
    </Layout>
  );
}
