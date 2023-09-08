import React from "react";

import { Context, templates } from "@reactivated";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/navigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { getSurveyUrlsUpdateStatus } from "@client/util/surveyWorker";

export default function (props: templates.SurveyWorkerTaskAdminer) {
  const cmklaunchUrlsTaskFetch = useFetch<{ detail: string }>();
  const djangoContext = React.useContext(Context);

  type taskTypeType = (typeof props.task_types)[number];

  function confirmTask(taskType: taskTypeType) {
    const isConfirmRefresh = confirm(`Really start task '${taskType}'?`);
    if (!isConfirmRefresh) {
      return;
    }

    void cmklaunchUrlsTaskFetch.fetchData(() =>
      getSurveyUrlsUpdateStatus(taskType, djangoContext.csrf_token)
    );
  }

  return (
    <Layout navbar={<NavigationBar />} title="Task Launcher">
      <section className="mw-rem-60 mx-auto p-2 px-3">
        {djangoContext.user.is_superuser && (
          <div className="row">
            <div className="col-sm-6">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Refresh Cmklaunch Stores</h5>
                  <p className="card-text">
                    Refresh Cmklaunch Stores by parsing each cmklaunch URL HTML source
                  </p>
                  <ButtonWithSpinner
                    type="button"
                    onClick={() => confirmTask("refresh_cmk_stores")}
                    fetchState={cmklaunchUrlsTaskFetch}
                    className="btn btn-secondary"
                  >
                    Admin: Refresh Stores
                  </ButtonWithSpinner>
                </div>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Resync OneHub</h5>
                  <p className="card-text">
                    Resync OneHub by authenticating (and invalidating previous sessions) and parsing
                    sync data to get new Cmklauch URLs
                  </p>
                  <ButtonWithSpinner
                    type="button"
                    onClick={() => confirmTask("re_sync_onehub")}
                    fetchState={cmklaunchUrlsTaskFetch}
                    className="btn btn-secondary"
                  >
                    Admin: Resync OneHub
                  </ButtonWithSpinner>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
