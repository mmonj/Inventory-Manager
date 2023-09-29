import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

export default function (props: templates.SurveyWorkerTicketSubmit) {
  return (
    <Layout title={props.title} navbar={<NavigationBar />}>
      <pre>{JSON.stringify(props, undefined, 2)}</pre>
    </Layout>
  );
}
