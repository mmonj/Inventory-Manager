import React from "react";

import { Context, interfaces, templates } from "@reactivated";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";
import { default as ReactSelect } from "react-select";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { useFetch } from "@client/hooks/useFetch";
import { getRepHubData, getTimeAgo } from "@client/util/surveyWorker";

interface ISelectOption {
  value: number;
  label: string;
}

export function Template(props: templates.SurveyWorkerRepSyncDataViewer) {
  const dataFetcher = useFetch<interfaces.IRepSyncDataResp>();
  const [selectedRepSubtype, setselectedRepSubtype] = React.useState<ISelectOption | null>(null);
  const djangoContext = React.useContext(Context);

  const repIdRef = React.useRef<HTMLSelectElement>(null);
  const dataTypeRef = React.useRef<HTMLSelectElement>(null);
  const isDownloadCheckRef = React.useRef<HTMLInputElement>(null);

  type SyncDataType = (typeof props.data_types)[number];

  const repDataSubtypes: ISelectOption[] = ["__none", ...props.rep_sync_data_subtypes].map(
    (dataType, idx) => {
      return {
        value: idx,
        label: dataType,
      };
    }
  );

  function downloadData(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data)], { type: "text/json" });
    const link = document.createElement("a");

    link.download = filename;
    link.href = window.URL.createObjectURL(blob);
    link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");

    const evt = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });

    link.dispatchEvent(evt);
    link.remove();
  }

  function handleDataFetch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedRepSubtype === null) {
      return;
    }
    if (
      selectedRepSubtype.label !== "__none" &&
      (dataTypeRef.current!.value as SyncDataType) !== "sync_data_json"
    ) {
      return;
    }

    const callback = () =>
      getRepHubData(
        parseInt(repIdRef.current!.value),
        dataTypeRef.current!.value,
        djangoContext.csrf_token,
        selectedRepSubtype.label
      );

    void (async () => {
      const [isSuccess, data] = await dataFetcher.fetchData(callback);
      if (isSuccess && isDownloadCheckRef.current!.checked) {
        downloadData(data.lookup_key + ".json", data);
      }
    })();
  }

  return (
    <Layout
      title={props.title}
      navbar={<NavigationBar />}
      extraStyles={["styles/react-json-viewer.css"]}
    >
      <section className="m-3 p-1 mw-rem-90 mx-auto">
        <h1 className="title-color mb-3">Rep App Sync Data</h1>
        <form className="mb-3" onSubmit={handleDataFetch}>
          <div className="my-1">
            <label className="form-label">Select a field rep</label>
            <select ref={repIdRef} className="form-select">
              {props.field_reps.map((fieldRep) => (
                <option key={fieldRep.id} value={fieldRep.id}>
                  {fieldRep.name}
                </option>
              ))}
            </select>
          </div>
          <div className="my-1">
            <label className="form-label">Select the type of data to fetch</label>
            <select ref={dataTypeRef} className="form-select">
              {props.data_types.map((dataType) => (
                <option key={dataType} value={dataType}>
                  {dataType}
                </option>
              ))}
            </select>
          </div>
          <div className="my-1">
            <label className="form-label">Select the data sub-type to fetch, if applicable</label>
            <ReactSelect
              options={repDataSubtypes}
              // value={repDataSubtypes[0]}
              onChange={setselectedRepSubtype}
              classNamePrefix="react-select"
              required
            />
          </div>

          <div className="form-check my-1 mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="set-is-download"
              ref={isDownloadCheckRef}
            />
            <label className="form-check-label" htmlFor="set-is-download">
              Download data as JSON
            </label>
          </div>

          <ButtonWithSpinner
            type="submit"
            className="btn btn-primary"
            spinnerVariant="light"
            fetchState={dataFetcher}
          >
            Get Data
          </ButtonWithSpinner>
        </form>

        {dataFetcher.data !== null && isDownloadCheckRef.current!.checked === false && (
          <>
            <div className="alert alert-info">
              <h5 className="m-1 my-2 text-dark">{dataFetcher.data.lookup_key}</h5>
              <span>
                <b>Last Syncced:</b> {getTimeAgo(dataFetcher.data.datetime_last_syncced)}
              </span>
            </div>
            <JsonView
              data={dataFetcher.data.data as never}
              shouldExpandNode={allExpanded}
              style={darkStyles}
            />
          </>
        )}
      </section>
    </Layout>
  );
}
