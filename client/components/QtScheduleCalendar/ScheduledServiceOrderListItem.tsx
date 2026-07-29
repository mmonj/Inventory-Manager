import React from "react";

import { ListGroup } from "react-bootstrap";

import { TServiceOrder } from "@client/util/qtSurveyWorker/scheduleUtils";
import { getFormattedEstimatedTime } from "@client/util/commonUtil";

import { StoreAddressBlock } from "./StoreAddressBlock";

interface Props {
  so: TServiceOrder;
  action: React.ReactNode;
}

export function ScheduledServiceOrderListItem(props: Props) {
  const { so } = props;

  return (
    <ListGroup.Item className="d-flex justify-content-between align-items-start gap-2">
      <div>
        <div className="fw-semibold">
          {so.JobId} {so.ServiceOrderDescription} ({so.ServiceOrderId})
        </div>
        <StoreAddressBlock so={so} />
      </div>

      <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
        <span className="text-info small">{getFormattedEstimatedTime(so.EstimatedTime)} Est.</span>
        {props.action}
      </div>
    </ListGroup.Item>
  );
}
