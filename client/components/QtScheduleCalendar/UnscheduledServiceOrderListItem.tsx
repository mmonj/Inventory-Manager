import React from "react";

import classNames from "classnames";
import { m } from "motion/react";

import { TServiceOrder } from "@client/util/qtSurveyWorker/scheduleUtils";
import { getFormattedEstimatedTime } from "@client/util/commonUtil";

import { StoreAddressBlock } from "./StoreAddressBlock";

interface Props {
  so: TServiceOrder;
  action: React.ReactNode;
  checkbox?: React.ReactNode;
  // Visually greys out the row
  isDisabled?: boolean;
}

export function UnscheduledServiceOrderListItem(props: Props) {
  const { so } = props;

  return (
    <m.div
      layout
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      initial={{ opacity: 0, height: 0 }}
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      animate={{ opacity: 1, height: "auto" }}
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={classNames(
        "list-group-item d-flex justify-content-between align-items-start gap-4 overflow-hidden",
        { "text-muted bg-body-tertiary": props.isDisabled === true }
      )}
    >
      {props.checkbox !== undefined && (
        <div className="flex-shrink-0 d-flex align-items-start pt-1">{props.checkbox}</div>
      )}
      <div className="qt-uso-row d-flex justify-content-between flex-grow-1 gap-2">
        <div className="qt-unscheduled-so-job-info d-flex flex-column gap-1">
          <div className="fw-semibold">
            {so.JobId} {so.ServiceOrderDescription} ({so.ServiceOrderId})
          </div>
          <div className="qt-uso-address-narrow">
            <StoreAddressBlock so={so} />
          </div>
        </div>

        <div className="qt-uso-address-wide" style={{ width: "28%" }}>
          <StoreAddressBlock so={so} />
        </div>

        <div
          className="qt-uso-estimate-wide text-info small text-end text-nowrap"
          style={{ width: "15%" }}
        >
          {getFormattedEstimatedTime(so.EstimatedTime)}
          <br />
          Estimated
        </div>

        <div className="qt-uso-action-wide flex-shrink-0">{props.action}</div>

        <div className="qt-uso-action-narrow flex-column align-items-end gap-2">
          <div className="text-info small text-end text-nowrap">
            {getFormattedEstimatedTime(so.EstimatedTime)}
            <br />
            Estimated
          </div>

          <div className="flex-shrink-0">{props.action}</div>
        </div>
      </div>
    </m.div>
  );
}
