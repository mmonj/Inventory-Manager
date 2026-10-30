import React, { useState } from "react";

import { Badge, Button } from "react-bootstrap";

import { faClock, faCopy, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  TVisitSequenceStoreActions,
  VisitSequenceOutcomeControls,
} from "@client/components/qtSurveyWorker/VisitSequenceOutcomeControls";
import {
  encodeQtAddress,
  getFormattedEstimatedTime,
  reformatServiceOrderDescription,
} from "@client/util/commonUtil";
import {
  TTerritoryServiceOrder,
  TTerritoryStore,
  getStoreEstimatedTime,
} from "@client/util/qtSurveyWorker/territoryView";

const NO_DUE_DATE = "No Due Date";

interface TDueDateGroup {
  dueDate: string;
  serviceOrders: TTerritoryServiceOrder[];
}

interface TServiceOrderGroup {
  // null when the popup isn't split by rep
  repUsername: string | null;
  dueDateGroups: TDueDateGroup[];
}

/** Service orders grouped by due date, earliest first (no due date last), each sorted by description. */
function groupByDueDate(serviceOrders: TTerritoryServiceOrder[]): TDueDateGroup[] {
  const serviceOrdersByDueDate: Record<string, TTerritoryServiceOrder[]> = {};
  for (const serviceOrder of serviceOrders) {
    const dueDate = serviceOrder.DateScheduleRangeEndOriginal || NO_DUE_DATE;
    if (!(dueDate in serviceOrdersByDueDate)) {
      serviceOrdersByDueDate[dueDate] = [];
    }
    serviceOrdersByDueDate[dueDate].push(serviceOrder);
  }

  return Object.keys(serviceOrdersByDueDate)
    .sort((a, b) => {
      if (a === NO_DUE_DATE) return 1;
      if (b === NO_DUE_DATE) return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    })
    .map((dueDate) => ({
      dueDate,
      serviceOrders: [...serviceOrdersByDueDate[dueDate]].sort((a, b) =>
        a.ServiceOrderDescription.localeCompare(b.ServiceOrderDescription)
      ),
    }));
}

export function MapPopupContent({
  store,
  showRepNames,
  visitSequenceActions,
}: {
  store: TTerritoryStore;
  // Splits the service orders by rep (then due date), for the combined territory
  showRepNames: boolean;
  // Only in a visit sequence
  visitSequenceActions: TVisitSequenceStoreActions | null;
}) {
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  function handleCopyAddress() {
    setClipboardMessage("Copied!");
    setTimeout(() => {
      setClipboardMessage(null);
    }, 1500);

    void navigator.clipboard.writeText(
      `${store.address.City}, ${store.address.State} | ${store.address.StreetAddress} | ${store.address.StoreName}`
    );
  }

  const totalHours = getStoreEstimatedTime(store);

  const serviceOrderGroups: TServiceOrderGroup[] = React.useMemo(() => {
    if (!showRepNames) {
      return [{ repUsername: null, dueDateGroups: groupByDueDate(store.serviceOrders) }];
    }
    const repUsernames = [
      ...new Set(store.serviceOrders.map((serviceOrder) => serviceOrder.repUsername)),
    ].sort();
    return repUsernames.map((repUsername) => ({
      repUsername,
      dueDateGroups: groupByDueDate(
        store.serviceOrders.filter((serviceOrder) => serviceOrder.repUsername === repUsername)
      ),
    }));
  }, [store.serviceOrders, showRepNames]);

  return (
    <div style={{ minWidth: "280px" }}>
      {/* Store Header */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="fw-bold text-primary mb-0">{store.address.StoreName}</h6>
        </div>

        {/* Address */}
        <div className="small mb-1 text-white">
          <div>{store.address.StreetAddress}</div>
          <div>
            {store.address.City}, {store.address.State} {store.address.PostalCode}
          </div>
          <small>
            {store.address.Latitude}, {store.address.Longitude}
          </small>
        </div>

        {/* Copy Address Button */}
        <Button
          variant="outline-secondary"
          size="sm"
          className="w-100 mt-2"
          onClick={handleCopyAddress}
        >
          <FontAwesomeIcon icon={faCopy} className="me-1" />
          {clipboardMessage !== null ? clipboardMessage : "Copy Address"}
        </Button>

        {visitSequenceActions !== null && (
          <VisitSequenceOutcomeControls
            siteId={store.address.SiteId}
            actions={visitSequenceActions}
            className="mt-2"
            textClassName="text-white"
          />
        )}
      </div>

      <hr className="my-2" />

      {/* Total Time */}
      <div className="mb-3">
        <Badge bg="success" className="w-100 py-2">
          <FontAwesomeIcon icon={faClock} className="me-2" />
          Total Time: {getFormattedEstimatedTime(totalHours)}
        </Badge>
      </div>

      {/* Service orders by rep (combined territory only), then due date */}
      <div>
        {serviceOrderGroups.map(({ repUsername, dueDateGroups }, groupIdx) => (
          <React.Fragment key={repUsername ?? ""}>
            {repUsername !== null && (
              <div className="fw-bold mb-2 text-white">
                <Badge bg="info" className="text-dark">
                  {repUsername}
                </Badge>
              </div>
            )}
            {dueDateGroups.map(({ dueDate, serviceOrders }, dueDateIdx) => (
              <React.Fragment key={dueDate}>
                <div className="mb-3">
                  <div className="fw-semibold mb-2 small text-white">
                    {dueDate === NO_DUE_DATE
                      ? NO_DUE_DATE
                      : `Due: ${new Date(dueDate).toLocaleDateString()}`}
                  </div>
                  <ul className="list-unstyled ps-2 mb-0">
                    {serviceOrders.map((serviceOrder) => (
                      <li
                        key={serviceOrder.ServiceOrderId}
                        className="small mb-2 d-flex justify-content-between"
                      >
                        <span className="flex-grow-1 me-2 text-white">
                          {reformatServiceOrderDescription(serviceOrder.ServiceOrderDescription)}
                        </span>
                        <Badge bg="secondary" pill className="align-self-start">
                          {getFormattedEstimatedTime(serviceOrder.EstimatedTime)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
                {(dueDateIdx < dueDateGroups.length - 1 ||
                  groupIdx < serviceOrderGroups.length - 1) && <hr className="my-2" />}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Google Maps Link */}
      <Button
        href={"https://www.google.com/maps/search/?api=1&query=" + encodeQtAddress(store.address)}
        target="_blank"
        rel="noreferrer"
        variant="primary"
        size="sm"
        className="w-100 mt-3 text-dark"
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} className="me-2" />
        Open in Google Maps
      </Button>
    </div>
  );
}
