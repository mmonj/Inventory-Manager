import React from "react";

import { Context, templates } from "@reactivated";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { AdminerItem } from "@client/components/surveyWorker/AdminerItem";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { getSurveyUrlsUpdateStatus } from "@client/util/surveyWorker";

export function Template(props: templates.SurveyWorkerTaskAdminer) {
  const workerTasksFetch = useFetch<{ detail: string }>();
  const djangoContext = React.useContext(Context);

  const mvFieldRepSelectRef = React.useRef<HTMLSelectElement>(null);

  type taskTypeType = (typeof props.task_types)[number];

  function confirmTask(taskType: taskTypeType, fieldRepId: number | null) {
    const isConfirmRefresh = confirm(`Really start task '${taskType}'?`);
    if (!isConfirmRefresh) {
      return;
    }

    void workerTasksFetch.fetchData(() =>
      getSurveyUrlsUpdateStatus(taskType, djangoContext.csrf_token, fieldRepId)
    );
  }

  return (
    <Layout navbar={<NavigationBar />} title="Task Launcher">
      <section className="mw-rem-60 mx-auto p-2 px-3">
        {!djangoContext.user.is_superuser && <h5>Nothing to see here if you are not an admin!</h5>}

        {djangoContext.user.is_superuser && (
          <div className="row">
            <AdminerItem
              title="Refresh CmkLaunch Stores"
              description="Refresh Cmklaunch Stores by parsing each cmklaunch URL HTML source"
            >
              <ButtonWithSpinner
                type="button"
                onClick={() => confirmTask("resync_stores_from_cmklaunchers", null)}
                fetchState={workerTasksFetch}
                className="btn btn-secondary"
              >
                Admin: Refresh Stores
              </ButtonWithSpinner>
            </AdminerItem>
            <AdminerItem
              title="Resync OneHub"
              description="Resync OneHub by authenticating (and invalidating previous sessions) and parsing sync data to get new Cmklauch URLs"
            >
              <ButtonWithSpinner
                type="button"
                onClick={() => confirmTask("resync_cmklaunchers_from_onehub", null)}
                fetchState={workerTasksFetch}
                className="btn btn-secondary"
              >
                Admin: Resync OneHub
              </ButtonWithSpinner>
            </AdminerItem>
            <AdminerItem title="ReSync Specific Rep" description="ReSync Specific Rep">
              <label htmlFor="mvRepIdSelect" className="form-label">
                Select a field rep
              </label>
              <select id="mvRepIdSelect" className="form-select mb-2" ref={mvFieldRepSelectRef}>
                {props.mv_reps.map((mvFieldRep) => {
                  return (
                    <option key={mvFieldRep.id} value={mvFieldRep.id}>
                      {mvFieldRep.field_representative.name}
                    </option>
                  );
                })}
              </select>
              <ButtonWithSpinner
                type="button"
                onClick={() =>
                  confirmTask("resync_specific_rep", parseInt(mvFieldRepSelectRef.current!.value))
                }
                fetchState={workerTasksFetch}
                className="btn btn-secondary"
              >
                Admin: Resync Rep&apos;s OneHub
              </ButtonWithSpinner>
            </AdminerItem>
          </div>
        )}
      </section>
    </Layout>
  );
}
