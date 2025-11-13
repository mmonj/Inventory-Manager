// client/templates/QtRepSessionDetails.tsx
import React from "react";

import { templates } from "@reactivated";
import { JsonView, darkStyles } from "react-json-view-lite";

import { format } from "date-fns/esm";
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";

import { NavigationBar } from "@client/components/qtSurveyWorker/NavigationBar";

import { Layout } from "../components/Layout";

export default function Template(props: templates.QtRepSessionDetails) {
  return (
    <Layout
      title="Rep Session Details"
      navbar={<NavigationBar />}
      className="mw-rem-60 mx-auto px-2"
      extraStyles={["styles/react-json-viewer.css"]}
    >
      <h1 className="my-4">Rep Session Details</h1>

      {props.rep_session_details.length === 0 ? (
        <p>No session data available.</p>
      ) : (
        <Container fluid>
          <Stack gap={4}>
            {props.rep_session_details.map((session) => (
              <React.Fragment key={session.id}>
                <h3 className="mb-1">Session Data for {session.rep_detail.username}</h3>
                <p className="my-1">
                  Session Last Updated:{" "}
                  {session.logged_in_datetime !== null
                    ? format(new Date(session.logged_in_datetime), "PPpp")
                    : "Never"}
                </p>
                {session.session_data !== null && (
                  <JsonView
                    data={session.session_data}
                    shouldExpandNode={() => true}
                    style={darkStyles}
                  />
                )}

                {session.session_data === null && (
                  <p className="alert alert-warning">No Session Data Available</p>
                )}
              </React.Fragment>
            ))}
          </Stack>
        </Container>
      )}
    </Layout>
  );
}
