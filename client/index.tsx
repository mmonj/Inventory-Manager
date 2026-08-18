import React from "react";
import ReactDOM from "react-dom/client";

import { MotionConfig } from "motion/react";

import { Provider, getServerData, getTemplate } from "@reactivated";

import { ToastHost } from "@client/components/ToastHost";

import "@client/scss/bs-dark/bootstrap.scss";
import "@client/scss/shared.scss";
import "@client/scss/survey_worker/styles.scss";

const { props, context } = getServerData();
const Template = await getTemplate(context);

ReactDOM.hydrateRoot(
  document,
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <Provider value={context}>
        <Template {...props} />
        <ToastHost />
      </Provider>
    </MotionConfig>
  </React.StrictMode>
);
