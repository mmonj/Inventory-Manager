import React from "react";

import { Context, MvRepDetail_146000D320, interfaces, templates } from "@reactivated";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/surveyWorker/NavigationBar";
import { RepWebHub } from "@client/components/surveyWorker/RepWebHub";
import { useFetch } from "@client/hooks/useFetch";
import { getLoginState } from "@client/util/surveyWorker";

export default function (props: templates.SurveyWorkerWebHub) {
  const [selectedMvRepDetail, setSelectedMvRepDetail] =
    React.useState<MvRepDetail_146000D320 | null>(null);
  const isLoggedInFetcher = useFetch<interfaces.IWebhubGetLoginState>();
  const djangoContext = React.useContext(Context);

  function handleSelectedMvrepDetailChange(event: React.ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === "") {
      return;
    }

    const mvRepDetail = props.mv_reps_detail.find(
      (mvRepDetail) => mvRepDetail.id === parseInt(event.target.value)
    );

    setSelectedMvRepDetail(() => mvRepDetail!);
  }

  function handleCheckLoginState(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedMvRepDetail === null) {
      return;
    }

    const callback = () => getLoginState(selectedMvRepDetail.id, djangoContext.csrf_token);
    void isLoggedInFetcher.fetchData(callback);
  }

  return (
    <Layout title={"WebHub"} navbar={<NavigationBar />}>
      <section className="mw-rem-60 mx-auto p-3">
        <form onSubmit={handleCheckLoginState} className="mb-2">
          <label className="form-label">Select a Field Rep</label>
          <select
            className="form-select"
            defaultValue={""}
            onChange={handleSelectedMvrepDetailChange}
            required
          >
            <option value="" disabled>
              Select a Field Rep
            </option>
            {props.mv_reps_detail.map((mvRepDetail) => (
              <option key={mvRepDetail.id} value={mvRepDetail.id}>
                {mvRepDetail.field_representative.name}
              </option>
            ))}
          </select>
          <ButtonWithSpinner
            type="submit"
            className="my-2 btn btn-primary"
            spinnerVariant="light"
            fetchState={isLoggedInFetcher}
          >
            Enter Rep&apos;s WebHub
          </ButtonWithSpinner>
        </form>

        {isLoggedInFetcher.data?.session_validity_data.ok == 0 && (
          <div className="alert alert-warning">
            <b>{selectedMvRepDetail!.field_representative.name} Login State:</b>{" "}
            {isLoggedInFetcher.data.session_validity_data.statusMessage}
          </div>
        )}

        {isLoggedInFetcher.data?.session_validity_data.ok == 1 && (
          <RepWebHub mv_rep_detail={selectedMvRepDetail!} />
        )}
      </section>
    </Layout>
  );
}
