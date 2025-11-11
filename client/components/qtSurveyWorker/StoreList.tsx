import React from "react";

import { Accordion, Badge, Button, Card } from "react-bootstrap";

import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";

import { faClock, faExternalLinkAlt, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { encodeQtAddress, getFormattedEstimatedTime } from "@client/util/commonUtil";
import { formatDateRange } from "@client/util/qtSurveyWorker/scheduleUtils";

interface Props {
  groupedByStore: Record<
    number,
    {
      address: SurveyWorkerQtraxWebsiteTypedefsAddress;
      jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
    }
  >;
}

export function StoreList({ groupedByStore }: Props) {
  const storeCount = Object.keys(groupedByStore).length;

  if (storeCount === 0) {
    return (
      <Card className="shadow-sm border-0 text-center py-5">
        <Card.Body>
          <div className="mb-3">
            <i className="fs-1">🏪</i>
          </div>
          <h4 className="mb-2">No Stores Found</h4>
          <p className="text-muted">Try adjusting your filters to see more results.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h3 className="h5 text-secondary">
          Store List{" "}
          <Badge bg="secondary" pill>
            {storeCount}
          </Badge>
        </h3>
      </div>

      <Accordion>
        {Object.values(groupedByStore).map(({ address, jobs }) => {
          let totalHours = 0;
          for (const job of jobs) {
            totalHours += job.EstimatedTime;
          }

          return (
            <Accordion.Item
              key={address.SiteId}
              eventKey={address.SiteId.toString()}
              className="mb-3 border-0 shadow-sm"
            >
              <Accordion.Header className="bg-white">
                <div className="w-100 pe-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="mb-0 text-primary fw-bold">
                      {address.StoreName || "(Unnamed Store)"}
                    </h5>
                    <Badge bg="primary" pill className="ms-2">
                      {jobs.length} {jobs.length === 1 ? "ticket" : "tickets"}
                    </Badge>
                  </div>
                  <div className="d-flex align-items-center text-muted small mb-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <span>
                      {address.StreetAddress}, {address.City}, {address.State} {address.PostalCode}
                    </span>
                  </div>
                  <div className="d-flex align-items-center text-muted small">
                    <FontAwesomeIcon icon={faClock} className="me-2" />
                    <span>
                      Total Time: <strong>{getFormattedEstimatedTime(totalHours)}</strong>
                    </span>
                  </div>
                </div>
              </Accordion.Header>
              <Accordion.Body className="bg-light">
                <div className="mb-3 d-flex justify-content-end">
                  <Button
                    href={
                      "https://www.google.com/maps/search/?api=1&query=" + encodeQtAddress(address)
                    }
                    target="_blank"
                    rel="noreferrer"
                    variant="outline-primary"
                    size="sm"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="me-1" />
                    Open in Maps
                  </Button>
                </div>

                <div>
                  {jobs.map((job, jobIndex) => (
                    <Card key={jobIndex} className="mb-3 border-0 shadow-sm">
                      <Card.Body className="p-3">
                        <div className="row g-2">
                          <div className="col-md-6">
                            <div className="mb-2">
                              <small className="text-muted d-block">Service Order ID</small>
                              <span className="fw-semibold">{job.ServiceOrderId}</span>
                            </div>
                            <div className="mb-2">
                              <small className="text-muted d-block">Description</small>
                              <span>{job.ServiceOrderDescription}</span>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-2">
                              <small className="text-muted d-block">Estimated Time</small>
                              <Badge bg="success" className="fw-normal">
                                <FontAwesomeIcon icon={faClock} className="me-1" />
                                {getFormattedEstimatedTime(job.EstimatedTime)}
                              </Badge>
                            </div>
                            <div className="mb-2">
                              <small className="text-muted d-block">Date Range</small>
                              <span className="text-secondary">
                                {formatDateRange(
                                  job.DateScheduleRangeStartOriginal,
                                  job.DateScheduleRangeEndOriginal
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
}
