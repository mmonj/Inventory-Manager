import React from "react";

import { Context, MvRepDetail_146000D320 } from "@reactivated";

import { useFetch } from "@client/hooks/useFetch";
import { getClockinState } from "@client/util/surveyWorker";

import { ButtonWithSpinner } from "../ButtonWithSpinner";

interface Props {
  mv_rep_detail: MvRepDetail_146000D320;
}

export function RepWebHub(props: Props) {
  const clockinFetcher = useFetch();
  const djangoContext = React.useContext(Context);

  function handleClockin() {
    const callback = () => getClockinState(props.mv_rep_detail.id, djangoContext.csrf_token);

    void clockinFetcher.fetchData(callback);
  }

  return (
    <div>
      <ButtonWithSpinner
        type="button"
        className="btn btn-primary"
        fetchState={clockinFetcher}
        onClick={handleClockin}
      >
        Clock In
      </ButtonWithSpinner>
    </div>
  );
}
