import React from "react";

import { Context, interfaces } from "@reactivated";

import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import { getClockinState } from "@client/util/surveyWorker";

interface Props {
  repId: number;
  csrfToken: string;
}

export function ClockinButton(props: Props) {
  const clockinFetcher = useFetch<interfaces.IWebhubClockinStateResp>();
  const djangoContext = React.useContext(Context);

  React.useEffect(() => {
    void clockinFetcher.fetchData(() => getClockinState(props.repId, props.csrfToken));
  }, []);

  if (clockinFetcher.isLoading) {
    return <LoadingSpinner isBlockElement={false} spinnerVariant="light" />;
  }

  if (clockinFetcher.data === null) {
    return <div>Error!</div>;
  }

  return (
    <>
      <button type="button" className="webhub-btn-clockin border rounded p-2">
        <img
          src={
            clockinFetcher.data.is_clocked_in === true
              ? djangoContext.STATIC_URL + "public/survey_worker/red-power-button-med.png"
              : djangoContext.STATIC_URL + "public/survey_worker/green-power-button-med.png"
          }
          alt="Clock-In-Clock-Out"
          style={{ maxHeight: "80%" }}
        />
        <b>{clockinFetcher.data.is_clocked_in === true ? "Clock Out" : "Clock In"}</b>
      </button>
    </>
  );
}
