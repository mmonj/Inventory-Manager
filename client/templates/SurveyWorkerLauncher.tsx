import React from "react";

import { SurveyWorkerInterfacesICmklaunchStoreInfo, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/surveyWorker/navigationBar";

interface IStoreGuid extends SurveyWorkerInterfacesICmklaunchStoreInfo {
  pk: number;
}

export default function (props: templates.SurveyWorkerLauncher) {
  const [selectedStore, setSelectedStore] = React.useState<IStoreGuid | null>(null);

  const cmklaunchStores = props.cmklaunch_stores.map(
    (store, idx): IStoreGuid => ({
      pk: idx,
      ...store,
    })
  );

  function handleStoreSubmission(fakePk: string) {
    setSelectedStore(() => cmklaunchStores.find((store) => store.pk === parseInt(fakePk)) ?? null);
  }

  function launchLinks() {
    selectedStore?.surveys.forEach((survey) => {
      window.open(survey.url, "_blank");
    });
  }

  function getDomainName(url: string): string {
    const hostname = new URL(url).hostname;
    return hostname.substring(hostname.lastIndexOf(".", hostname.lastIndexOf(".") - 1) + 1);
  }

  return (
    <Layout title="Survey Launcher" navbar={<NavigationBar />}>
      <section className="mw-rem-60 mx-auto p-2 px-3">
        <h1 className="title-color text-center p-2">Survey Launcher</h1>

        <FieldRepStoreSelector
          propType="stores"
          stores={cmklaunchStores}
          submitButtonText="Search for store surveys"
          handleStoreSubmission={handleStoreSubmission}
        />

        {selectedStore !== null && (
          <div className="alert alert-info">
            <h5 className="mb-3" style={{ color: "unset" }}>
              Available surveys for store <span className="fw-bold">{selectedStore.name}</span>
            </h5>

            {selectedStore.surveys.map((survey, idx) => (
              <p
                key={idx}
                className="m-1"
                style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
              >
                <span className="fw-bold">{survey.category}: </span>
                <a href={survey.url} style={{ color: "unset" }}>
                  {getDomainName(survey.url)}
                </a>
              </p>
            ))}

            <button onClick={launchLinks} type="button" className="btn btn-primary mt-3">
              Launch all Links
            </button>
          </div>
        )}
      </section>
    </Layout>
  );
}
