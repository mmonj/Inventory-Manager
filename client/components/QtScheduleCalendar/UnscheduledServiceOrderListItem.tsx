import React from "react";

import { ListGroup } from "react-bootstrap";

import { TServiceOrder } from "@client/util/qtSurveyWorker/scheduleUtils";
import { getFormattedEstimatedTime } from "@client/util/commonUtil";

import { StoreAddressBlock } from "./StoreAddressBlock";

interface Props {
  so: TServiceOrder;
  action: React.ReactNode;
  checkbox?: React.ReactNode;
}

export function UnscheduledServiceOrderListItem(props: Props) {
  const { so } = props;

  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-start gap-4">
      {props.checkbox !== undefined && (
        <div className="flex-shrink-0 d-flex align-items-start pt-1">{props.checkbox}</div>
      )}
      <div className="fw-semibold" style={{ width: "28%" }}>
        {so.JobId} {so.ServiceOrderDescription} ({so.ServiceOrderId})
      </div>

      <div style={{ width: "28%" }}>
        <StoreAddressBlock so={so} />
      </div>

      <div className="text-info small text-end" style={{ width: "15%" }}>
        {getFormattedEstimatedTime(so.EstimatedTime)}
        <br />
        Estimated
      </div>

      <div className="flex-shrink-0">{props.action}</div>
    </ListGroup.Item>
  );
}
