import React from "react";
import ReactDOM from "react-dom/client";

import { MotionConfig } from "motion/react";

import { Provider, getServerData, getTemplate } from "@reactivated";

import { QueryProvider } from "@client/components/QueryProvider";

import "@client/scss/bs-dark/bootstrap.scss";
import "@client/scss/shared.scss";
import "@client/scss/survey_worker/styles.scss";

const { props, context } = getServerData();
const Template = await getTemplate(context);

ReactDOM.hydrateRoot(
  document,
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <QueryProvider>
        <Provider value={context}>
          <Template {...props} />
        </Provider>
      </QueryProvider>
    </MotionConfig>
  </React.StrictMode>
);
