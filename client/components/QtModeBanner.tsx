import React from "react";

import classNames from "classnames";

import { Context } from "@reactivated";

import "@client/scss/qt-mode-banner.scss";

// Development only: says whether a schedule change on this page would reach the real Qt
export function QtModeBanner() {
  const qtMode = React.useContext(Context).qt_mode;

  if (qtMode === null) {
    return null;
  }

  const isLive = qtMode.mode === "live";

  return (
    <div className={classNames("qt-mode-banner", { "qt-mode-banner--live": isLive })}>
      {isLive ? `Qt: LIVE until ${qtMode.live_until_time}` : "Qt: fake"}
    </div>
  );
}
