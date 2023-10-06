import React from "react";

import { Context, MvRepDetail_146000D320 } from "@reactivated";

import { ClockinButton } from "./ClockInButton";

interface Props {
  mv_rep_detail: MvRepDetail_146000D320;
}

export function RepWebHub(props: Props) {
  const djangoContext = React.useContext(Context);

  return (
    <div className="my-3">
      <div className="container-md">
        <div className="d-flex justify-content-between">
          <div className="text-center">
            <ClockinButton csrfToken={djangoContext.csrf_token} repId={props.mv_rep_detail.id} />
          </div>
          <div>Sync</div>
        </div>
        <div>Other Content</div>
      </div>
    </div>
  );
}
