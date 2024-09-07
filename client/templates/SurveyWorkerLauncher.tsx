import React from "react";

import { SurveyWorkerInterfacesICmklaunchStoreInfo, templates } from "@reactivated";

import { format, parse } from "date-fns/esm";
import { AnimatePresence, motion } from "framer-motion";

import { Layout } from "@client/components/Layout";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { isGreaterThanXHoursAgo } from "@client/util/commonUtil";
import { getTimeAgo } from "@client/util/surveyWorker";

interface IStoreGuid extends SurveyWorkerInterfacesICmklaunchStoreInfo {
  pk: number;
}

export default function (props: templates.SurveyWorkerLauncher) {
  const [selectedStore, setSelectedStore] = React.useState<IStoreGuid | null>(null);
  const [isCmklaunchUrlsShown, setIsCmklaunchUrlsShown] = React.useState(false);
  const [timeLoaded, _setTimeLoaded] = React.useState(Date.now());

  const maxHoursStaleContent = 8;

  const isTimeToRefresh = isGreaterThanXHoursAgo(timeLoaded, maxHoursStaleContent);

  const slideInVariants = {
    hidden: { x: "130vw" },
    visible: { x: 0 },
    exit: { x: "-130vw" },
  };

  function handleStoreSubmission(fakePk: string) {
    const cmklaunchStores = props.cmk_rep_stores_list.flatMap((rep) => rep.stores);
    setSelectedStore(() => cmklaunchStores.find((store) => store.pk === parseInt(fakePk)) ?? null);
  }

  function launchLinks() {
    selectedStore?.surveys.forEach((survey) => {
      window.open(survey.url, "_blank");
    });
  }

  function toggleShowOriginalCmklaunchUrls() {
    setIsCmklaunchUrlsShown((prev) => !prev);
  }

  function getDomainName(url: string): string {
    const hostname = new URL(url).hostname;
    return hostname.substring(hostname.lastIndexOf(".", hostname.lastIndexOf(".") - 1) + 1);
  }

  return (
    <Layout title="Survey Launcher" navbar={<NavigationBar />}>
      <section className="mw-rem-60 mx-auto p-2 px-3">
        {isTimeToRefresh === true && (
          <div className="alert alert-warning fw-bold">
            It has been more than {maxHoursStaleContent} hour(s) since you last refreshed this page.
            <button
              className="btn btn-secondary d-block my-2"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        )}
        <h1 className="title-color text-center p-2">Survey Launcher</h1>

        <div className="alert alert-info">
          <div>
            <strong>Showing Cycle:</strong>{" "}
            {format(parse(props.cycle_start_date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")} -{" "}
            {format(parse(props.cycle_end_date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}
          </div>
          <div>
            <strong>Store List Last Syncced:</strong> {getTimeAgo(props.datetime_last_refreshed)}
          </div>
          <div>
            <strong>Cmklaunch URLs Pooled:</strong> {props.cmklaunch_urls.length}{" "}
            <button
              onClick={toggleShowOriginalCmklaunchUrls}
              type="button"
              className="btn btn-secondary py-0 px-1"
            >
              {!isCmklaunchUrlsShown ? "Show" : "Hide"}
            </button>
          </div>

          {isCmklaunchUrlsShown && (
            <div className="mt-2 p-2 border border-secondary rounded">
              <h5 className="text-dark">Original Cmklaunch URLs</h5>
              {props.cmklaunch_urls.map((cmklaunchUrl, idx) => (
                <a
                  key={idx}
                  href={cmklaunchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="d-block text-secondary py-1"
                  style={{
                    overflow: "auto",
                  }}
                >
                  {cmklaunchUrl}
                </a>
              ))}
            </div>
          )}
        </div>

        <FieldRepStoreSelector
          propType="fieldReps"
          field_reps={props.cmk_rep_stores_list}
          submitButtonText="Search for Surveys"
          handleStoreSubmission={handleStoreSubmission}
          isHandleSubmissionWithoutButton={true}
        />

        <AnimatePresence mode="popLayout">
          {!!selectedStore && (
            <motion.div
              key={selectedStore.guid}
              className="alert alert-info"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideInVariants}
              transition={{ type: "bounce", stiffness: 60, damping: 20, duration: 0.4 }}
            >
              <h5 className="mb-3" style={{ color: "unset" }}>
                Available surveys for store <span className="fw-bold">{selectedStore.name}</span>
              </h5>
              {selectedStore.surveys
                .sort((a, b) => (a.category < b.category ? 1 : -1))
                .map((survey, idx) => (
                  <p
                    key={idx}
                    className="m-1"
                    style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                  >
                    <span className="fw-bold">{survey.category}: </span>
                    <a
                      href={survey.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "unset" }}
                    >
                      {getDomainName(survey.url)}
                    </a>
                  </p>
                ))}
              <button onClick={launchLinks} type="button" className="btn btn-primary mt-3">
                Open all Surveys
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </Layout>
  );
}
