import React, { useState } from "react";

import { Badge, Button } from "react-bootstrap";

import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";

import { faClock, faCopy, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  encodeQtAddress,
  getFormattedEstimatedTime,
  reformatServiceOrderDescription,
} from "@client/util/commonUtil";

export function MapPopupContent({
  locationGroup,
}: {
  locationGroup: {
    address: SurveyWorkerQtraxWebsiteTypedefsAddress;
    jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
  };
}) {
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  function handleCopyAddress() {
    setClipboardMessage("Copied!");
    setTimeout(() => {
      setClipboardMessage(null);
    }, 1500);

    void navigator.clipboard.writeText(
      `${locationGroup.address.City}, ${locationGroup.address.State} | ${locationGroup.address.StreetAddress} | ${locationGroup.address.StoreName}`
    );
  }

  let totalHours = 0;
  for (const job of locationGroup.jobs) {
    totalHours += job.EstimatedTime;
  }

  // group jobs by due date
  const jobsByDueDate: Record<string, SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[]> =
    React.useMemo(() => {
      const _jobsByDueDate: Record<string, SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[]> = {};
      for (const job of locationGroup.jobs) {
        const dueDate = job.DateScheduleRangeEndOriginal || "No Due Date";
        if (!(dueDate in _jobsByDueDate)) {
          _jobsByDueDate[dueDate] = [];
        }
        _jobsByDueDate[dueDate].push(job);
      }

      // sort jobs by ServiceOrderDescription
      for (const [dueDate, jobs] of Object.entries(_jobsByDueDate)) {
        _jobsByDueDate[dueDate] = jobs.sort((a, b) =>
          a.ServiceOrderDescription.localeCompare(b.ServiceOrderDescription)
        );
      }

      return _jobsByDueDate;
    }, [locationGroup.jobs]);

  // Sort due dates
  const sortedDueDates = Object.keys(jobsByDueDate).sort((a, b) => {
    if (a === "No Due Date") return 1;
    if (b === "No Due Date") return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div style={{ minWidth: "280px" }}>
      {/* Store Header */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="fw-bold text-primary mb-0">{locationGroup.address.StoreName}</h6>
        </div>

        {/* Address */}
        <div className="small mb-1">
          <div>{locationGroup.address.StreetAddress}</div>
          <div>
            {locationGroup.address.City}, {locationGroup.address.State}{" "}
            {locationGroup.address.PostalCode}
          </div>
          <small>
            {locationGroup.address.Latitude}, {locationGroup.address.Longitude}
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
      </div>

      <hr className="my-2" />

      {/* Total Time */}
      <div className="mb-3">
        <Badge bg="success" className="w-100 py-2">
          <FontAwesomeIcon icon={faClock} className="me-2" />
          Total Time: {getFormattedEstimatedTime(totalHours)}
        </Badge>
      </div>

      {/* Jobs by Due Date */}
      <div>
        {sortedDueDates.map((dueDate, idx) => (
          <React.Fragment key={dueDate}>
            <div className="mb-3">
              <div className="fw-semibold mb-2 small text-secondary">
                {dueDate === "No Due Date"
                  ? "No Due Date"
                  : `Due: ${new Date(dueDate).toLocaleDateString()}`}
              </div>
              <ul className="list-unstyled ps-2 mb-0">
                {jobsByDueDate[dueDate].map((job) => (
                  <li key={job.JobId} className="small mb-2 d-flex justify-content-between">
                    <span className="flex-grow-1 me-2">
                      {reformatServiceOrderDescription(job.ServiceOrderDescription)}
                    </span>
                    <Badge bg="secondary" pill className="align-self-start">
                      {getFormattedEstimatedTime(job.EstimatedTime)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
            {idx < sortedDueDates.length - 1 && <hr className="my-2" />}
          </React.Fragment>
        ))}
      </div>

      {/* Google Maps Link */}
      <Button
        href={
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeQtAddress(locationGroup.address)
        }
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
