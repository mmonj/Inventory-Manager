import React from "react";

import { templates } from "@reactivated";
import { HashRouter, Route, Routes } from "react-router-dom";

import { Layout } from "@client/components/Layout";
import { StatusModal } from "@client/components/stockTracker/StatusModal";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { RepHub } from "@client/components/surveyWorker/WebHub/RepHub";
import { RepPicker } from "@client/components/surveyWorker/WebHub/RepPicker";
import { HubModalController, defaultModalState } from "@client/util/surveyWorker/context";
import { THubModalState } from "@client/util/surveyWorker/types";

export default function (props: templates.SurveyWorkerWebHub) {
  const [isRender, setIsRender] = React.useState(false);
  const [modalStatus, setModalStatus] = React.useState<THubModalState>(defaultModalState);

  React.useEffect(() => {
    if (isRender === false) {
      setIsRender(() => true);
    }
  }, []);

  return (
    <Layout
      title={"WebHub"}
      navbar={<NavigationBar />}
      extraStyles={["styles/survey_worker/styles.css"]}
    >
      <section className="mw-rem-60 mx-auto p-3">
        <HubModalController.Provider value={{ setStatus: setModalStatus }}>
          <StatusModal modalStatus={modalStatus} setStatus={setModalStatus} />

          {isRender && (
            <HashRouter basename="/">
              <Routes>
                <Route path="/" element={<RepPicker mv_reps_detail={props.mv_reps_detail} />} />
                <Route path="/RepHub">
                  <Route path=":mv_rep_detail_id" element={<RepHub />} />
                </Route>
              </Routes>
            </HashRouter>
          )}
        </HubModalController.Provider>
      </section>
    </Layout>
  );
}
