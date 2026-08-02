import React from "react";
import ReactDOM from "react-dom/client";

import { Provider, getServerData, getTemplate } from "@reactivated";

import "@client/scss/bs-dark/bootstrap.scss";
import "@client/scss/shared.scss";
import "@client/scss/survey_worker/styles.scss";

const { props, context } = getServerData();
const Template = await getTemplate(context);

ReactDOM.hydrateRoot(
  document,
  <React.StrictMode>
    <Provider value={context}>
      <Template {...props} />
    </Provider>
  </React.StrictMode>
);
