import React from "react";

import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";
import { Accordion } from "react-bootstrap";

import { getFormattedEstimatedTime } from "@client/util/commonUtil";
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
  return (
    <Accordion className="list-group list-group-flush">
      {Object.values(groupedByStore).map(({ address, jobs }) => {
        let totalHours = 0;
        for (const job of jobs) {
          totalHours += job.EstimatedTime;
        }

        return (
          <Accordion.Item
            key={address.SiteId}
            eventKey={address.SiteId.toString()}
            className="list-group-item"
          >
            <Accordion.Header>
              <div>
                <h5 className="mb-1">{address.StoreName || "(Unnamed Store)"}</h5>
                <p className="mb-1 text-secondary">
                  {address.StreetAddress}, {address.City}, {address.State} {address.PostalCode}
                </p>
                <small className="text-muted">{jobs.length} tickets</small>
              </div>
            </Accordion.Header>
            <Accordion.Body className="p-0">
              <ul className="list-group list-group-flush alert alert-info rounded-1 p-3 position-relative">
                <a
                  href={`https://www.google.com/maps/place/${address.MapLink}`}
                  target="_blank"
                  rel="noreferrer"
                  className="position-absolute top-0 end-0 mt-2 me-2 text-primary"
                  title="Open in Google Maps"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    fill="currentColor"
                    className="bi bi-sign-turn-right-fill"
                    viewBox="0 0 16 16"
                  >
                    <path d="M9.05.435c-.58-.58-1.52-.58-2.1 0L.436 6.95c-.58.58-.58 1.519 0 2.098l6.516 6.516c.58.58 1.519.58 2.098 0l6.516-6.516c.58-.58.58-1.519 0-2.098zM9 8.466V7H7.5A1.5 1.5 0 0 0 6 8.5V11H5V8.5A2.5 2.5 0 0 1 7.5 6H9V4.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L9.41 8.658A.25.25 0 0 1 9 8.466" />
                  </svg>
                </a>
                <li className="list-unstyled mb-3">
                  <strong>Total Estimated Time: {getFormattedEstimatedTime(totalHours)}</strong>
                </li>
                {jobs.map((job, jobIndex) => (
                  <React.Fragment key={jobIndex}>
                    <li className="list-unstyled">
                      <strong>Description:</strong> {job.ServiceOrderDescription}
                      <br />
                      <strong>Estimated Time:</strong>{" "}
                      {getFormattedEstimatedTime(job.EstimatedTime)}
                      <br />
                      <strong>Date Range:</strong>{" "}
                      {formatDateRange(
                        job.DateScheduleRangeStartOriginal,
                        job.DateScheduleRangeEndOriginal
                      )}
                    </li>
                    {jobIndex < jobs.length - 1 && <hr />}
                  </React.Fragment>
                ))}
              </ul>
            </Accordion.Body>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
