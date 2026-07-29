import React from "react";

import classNames from "classnames";

import { faBuilding } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TServiceOrder, formatWindow } from "@client/util/qtSurveyWorker/scheduleUtils";

export function StoreAddressBlock(props: { so: TServiceOrder }) {
  const { so } = props;

  return (
    <div className="d-flex gap-2">
      <FontAwesomeIcon
        icon={faBuilding}
        size="2x"
        className={classNames({
          "text-info": so.Address.IsPhysicalVisit,
          "text-secondary": !so.Address.IsPhysicalVisit,
        })}
      />
      <div>
        <div className="fw-semibold">{so.Address.StoreName}</div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${so.Address.MapLink}`}
          target="_blank"
          rel="noreferrer"
          className="text-muted small d-block text-decoration-none"
        >
          <div>{so.Address.StreetAddress}</div>
          <div>
            {so.Address.City}, {so.Address.State} {so.Address.PostalCode}
          </div>
        </a>
        {so.Address.Phone !== null && <div className="text-muted small">{so.Address.Phone}</div>}
        <div className="fw-semibold small">Window: {formatWindow(so)}</div>
      </div>
    </div>
  );
}
