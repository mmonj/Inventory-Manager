import React from "react";

import { CSRFToken, reverse, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";

export default function (props: templates.SurveyWorkerManualCmkUrls) {
  const ulElementRef = React.useRef<HTMLUListElement>(null);

  if (props.message !== "") {
    return (
      <Layout
        title={"CMK HTML Source Form"}
        navbar={<NavigationBar />}
        extraStyles={["styles/survey_worker/styles.css"]}
      >
        <div className="text-center mx-auto mw-rem-70">
          <div className="alert alert-info">{props.message}</div>
        </div>
      </Layout>
    );
  }

  function handleOpenAllUrls() {
    props.cmk_urls.forEach((url) => window.open(url, "_blank"));
  }

  return (
    <Layout
      title={"CMK HTML Source Form"}
      navbar={<NavigationBar />}
      extraStyles={["styles/survey_worker/styles.css"]}
    >
      <h1 className="title-color text-center py-4">Manual CMK HTML Form</h1>
      <div className="text-center my-3">
        <button type="button" className="btn btn-primary" onClick={handleOpenAllUrls}>
          Open All URLs
        </button>
      </div>

      <form action={reverse("survey_worker:manual_cmklaunch_html")} method="POST">
        <CSRFToken />
        <div className="mw-rem-70 mx-auto border">
          <ul ref={ulElementRef} className="list-group list-group-flush">
            {props.cmk_urls.map((cmkUrl, idx) => (
              <li key={idx} className="list-group-item py-2 my-2">
                <label className="overflow-hidden d-block my-1">
                  <a className="d-block" href={cmkUrl} target="_blank" rel="noreferrer">
                    {new URL(cmkUrl).pathname}
                  </a>
                </label>
                <input name="cmk-url" type="hidden" value={cmkUrl} />
                <input name="html-src" type="text" className="form-control py-2" />
              </li>
            ))}
          </ul>
        </div>
        <div className="text-center my-3">
          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </div>
      </form>
    </Layout>
  );
}
