// client/templates/QtRepSessionDetails.tsx
import React from "react";

import { templates } from "@reactivated";

import { format } from "date-fns/esm";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";

import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

import { Layout } from "../components/Layout";

export default function Template(props: templates.QtRepSessionDetails) {
  return (
    <Layout
      title="Rep Session Details"
      navbar={<NavigationBar />}
      className="mw-rem-60 mx-auto px-2"
    >
      <h1 className="my-4">Rep Session Details</h1>

      {props.rep_session_details.length === 0 ? (
        <p>No session data available.</p>
      ) : (
        <Container fluid>
          <Stack gap={4}>
            {props.rep_session_details.map((session) => (
              <Card key={session.id} className="shadow-sm">
                <Card.Header>
                  <h5 className="mb-0">{session.rep_detail.username}</h5>
                </Card.Header>
                <Card.Body>
                  <Card.Title>Session Data</Card.Title>
                  <p>
                    Session Last Updated: {format(new Date(session.logged_in_datetime), "PPpp")}
                  </p>
                  <pre className="p-3 rounded">
                    {JSON.stringify(session.session_data, undefined, 2)}
                  </pre>
                </Card.Body>
              </Card>
            ))}
          </Stack>
        </Container>
      )}
    </Layout>
  );
}
