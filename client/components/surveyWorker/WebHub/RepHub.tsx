import React from "react";

import { Context, interfaces } from "@reactivated";
import { Link, useParams } from "react-router-dom";

import { ButtonWithSpinner } from "@client/components/ButtonWithSpinner";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import { getLoginState, reauthenticateHubUser } from "@client/util/surveyWorker";

import { ClockinButton } from "./ClockInButton";
import { CurrentCheckIn } from "./CurrentCheckIn";
import { SyncInfo } from "./SyncInfo";

export function RepHub() {
  const params = useParams();
  const isLoggedInFetcher = useFetch<interfaces.IWebhubGetLoginState>();
  const reauthenticateFetcher = useFetch<interfaces.IWebhubReauthenticateResp>();
  const djangoContext = React.useContext(Context);

  const current_mv_rep_detail_id = params.mv_rep_detail_id!;

  function handleCheckLoginState() {
    const callback = () =>
      getLoginState(parseInt(current_mv_rep_detail_id), djangoContext.csrf_token);
    void isLoggedInFetcher.fetchData(callback);
  }

  async function handleReauthenticate() {
    const callback = () =>
      reauthenticateHubUser(parseInt(current_mv_rep_detail_id), djangoContext.csrf_token);

    await reauthenticateFetcher.fetchData(callback);
  }

  React.useEffect(() => {
    handleCheckLoginState();
  }, []);

  if (isLoggedInFetcher.data === null) {
    return (
      <div className="text-center">
        {isLoggedInFetcher.isLoading && (
          <div>
            Fetching login state...{" "}
            <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
          </div>
        )}
        {isLoggedInFetcher.isError &&
          isLoggedInFetcher.errorMessages.map((message, idx) => <div key={idx}>{message}</div>)}
      </div>
    );
  }

  return (
    <section id="rephub" className="my-3">
      <h1 className="title-color text-center mb-3">
        {isLoggedInFetcher.data.mv_rep_detail.field_representative.name}&apos;s Hub
      </h1>
      {isLoggedInFetcher.data?.session_validity_data.ok == 0 &&
        reauthenticateFetcher.data === null && (
          <div className="alert alert-warning">
            <b>{isLoggedInFetcher.data.mv_rep_detail.field_representative.name} Login State:</b>{" "}
            {isLoggedInFetcher.data.session_validity_data.statusMessage}
            <ButtonWithSpinner
              onClick={handleReauthenticate}
              fetchState={reauthenticateFetcher}
              className="btn btn-primary d-block"
              type="button"
              spinnerVariant="light"
            >
              Re-Authenticate
            </ButtonWithSpinner>
          </div>
        )}

      {(isLoggedInFetcher.data.session_validity_data.ok === 1 ||
        reauthenticateFetcher.data?.is_success === true) && (
        <div className="rephub-container">
          <div className="d-flex justify-content-around">
            <ClockinButton
              repId={isLoggedInFetcher.data.mv_rep_detail.id}
              className="rephub-top-action-elements"
            />
            <SyncInfo />
          </div>
          <div className="rephub-main-content border rounded p-2 my-2">
            <CurrentCheckIn />
          </div>
          <div className="btn-group w-100 rephub-footer" role="group">
            <Link
              to={`/RepHub/${current_mv_rep_detail_id}`}
              type="button"
              className="btn btn-outline-light"
            >
              Home
            </Link>
            <Link
              to={`/RepHub/${current_mv_rep_detail_id}/tickets`}
              type="button"
              className="btn btn-outline-light"
            >
              Tickets
            </Link>
            <Link
              to={`/RepHub/${current_mv_rep_detail_id}/stores`}
              type="button"
              className="btn btn-outline-light"
            >
              Stores
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
