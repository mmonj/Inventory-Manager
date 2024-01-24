import React from "react";

import { Context, interfaces } from "@reactivated";

import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import {
  getClockinState,
  handleHubModalByFetch,
  handleHubModalByUseFetchHook,
  webhubClockIn,
} from "@client/util/surveyWorker";
import { HubModalController } from "@client/util/surveyWorker/context";

interface Props {
  repId: number;
  className?: string;
}

export function ClockinButton({ className = "", ...props }: Props) {
  const clockinStateFetcher = useFetch<interfaces.IWebhubClockinStateResp>();
  const djangoContext = React.useContext(Context);
  const modalController = React.useContext(HubModalController);

  const callbackGetClockinState = () => getClockinState(props.repId, djangoContext.csrf_token);

  function handleClockin() {
    const isClockin = confirm("Confirm clock in");
    if (!isClockin) {
      console.log("Clock in not confirmed");
      return;
    }

    console.log("Executing clock in");

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const callbackExecClockin = () =>
        webhubClockIn(props.repId, latitude, longitude, djangoContext.csrf_token);

      void handleHubModalByFetch(callbackExecClockin, modalController, "Clocking in").then(() => {
        handleHubModalByUseFetchHook(
          () => clockinStateFetcher.fetchData(callbackGetClockinState),
          modalController,
          "Getting clock-in state"
        );
      });
    });
  }

  React.useEffect(() => {
    void clockinStateFetcher.fetchData(callbackGetClockinState);
  }, []);

  function ButtonInnerState() {
    if (clockinStateFetcher.isLoading) {
      return <LoadingSpinner isBlockElement={false} spinnerVariant="light" />;
    } else if (clockinStateFetcher.isError) {
      return <span>Error! Error Occurred!</span>;
    } else if (clockinStateFetcher.data === null) {
      return <span>Error! No Data.</span>;
    } else {
      return (
        <>
          <img
            src={
              clockinStateFetcher.data.is_clocked_in === true
                ? djangoContext.STATIC_URL + "public/survey_worker/red-power-button-med.png"
                : djangoContext.STATIC_URL + "public/survey_worker/green-power-button-med.png"
            }
            alt="Clock-In-Clock-Out"
          />
          <b>{clockinStateFetcher.data.is_clocked_in === true ? "Clock Out" : "Clock In"}</b>
        </>
      );
    }
  }

  return (
    <>
      <div className={className + " " + "text-center"}>
        <button
          type="button"
          onClick={handleClockin}
          disabled={clockinStateFetcher.isLoading}
          className="mm-unset webhub-clock-in-btn border rounded p-2"
        >
          <ButtonInnerState />
        </button>
      </div>
    </>
  );
}
