import React from "react";

import { motion } from "motion/react";

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
    <motion.div
      layout
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      initial={{ opacity: 0, height: 0 }}
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      animate={{ opacity: 1, height: "auto" }}
      // react-doctor-disable-next-line react-doctor/no-layout-property-animation
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="list-group-item d-flex justify-content-between align-items-start gap-2 overflow-hidden"
    >
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
    </motion.div>
  );
}
