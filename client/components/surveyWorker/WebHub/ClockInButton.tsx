import React from "react";

import { Context, interfaces } from "@reactivated";

import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import { getClockinState } from "@client/util/surveyWorker";

interface Props {
  repId: number;
  className?: string;
}

export function ClockinButton({ className = "", ...props }: Props) {
  const clockinFetcher = useFetch<interfaces.IWebhubClockinStateResp>();
  const djangoContext = React.useContext(Context);

  React.useEffect(() => {
    void clockinFetcher.fetchData(() => getClockinState(props.repId, djangoContext.csrf_token));
  }, []);

  function ButtonInnerState() {
    if (clockinFetcher.isLoading) {
      return <LoadingSpinner isBlockElement={false} spinnerVariant="light" />;
    } else if (clockinFetcher.isError) {
      return <span>Error! Error Occurred!</span>;
    } else if (clockinFetcher.data === null) {
      return <span>Error! No Data.</span>;
    } else {
      return (
        <>
          <img
            src={
              clockinFetcher.data.is_clocked_in === true
                ? djangoContext.STATIC_URL + "public/survey_worker/red-power-button-med.png"
                : djangoContext.STATIC_URL + "public/survey_worker/green-power-button-med.png"
            }
            alt="Clock-In-Clock-Out"
            style={{ maxHeight: "80%", maxWidth: "80%" }}
          />
          <b>{clockinFetcher.data.is_clocked_in === true ? "Clock Out" : "Clock In"}</b>
        </>
      );
    }
  }

  return (
    <>
      <div className={className + " " + "text-center"}>
        <button
          type="button"
          className="mm-unset border rounded p-2"
          style={{ maxHeight: "100%", maxWidth: "100%" }}
        >
          <ButtonInnerState />
        </button>
      </div>
    </>
  );
}
