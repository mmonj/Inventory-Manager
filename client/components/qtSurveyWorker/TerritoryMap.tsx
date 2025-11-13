import React, { useContext, useState } from "react";

import {
  Context,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import L, { LatLngLiteral } from "leaflet";

import {
  encodeQtAddress,
  getFormattedEstimatedTime,
  reformatServiceOrderDescription,
} from "@client/util/commonUtil";

const iconUrls = {
  green:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  red: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
};

function getCustomIcon(color: keyof typeof iconUrls) {
  return new L.Icon({
    iconUrl: iconUrls[color],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function MapPopupContent({
  locationGroup,
}: {
  locationGroup: {
    address: SurveyWorkerQtraxWebsiteTypedefsAddress;
    jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
  };
}) {
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const djangoContext = useContext(Context);

  function handleCopyAddress() {
    setClipboardMessage("Address Copied!");
    setTimeout(() => {
      setClipboardMessage(null);
    }, 2000);

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
    <div>
      <div className="fw-bold h6">{locationGroup.address.StoreName}</div>
      <div className="d-flex justify-content-between">
        <div>
          <span className="d-block" style={{ fontSize: "1rem" }}>
            {locationGroup.address.StreetAddress}
          </span>
          <small className="d-block" style={{ fontSize: "0.9rem" }}>
            {locationGroup.address.City}, {locationGroup.address.State}{" "}
            {locationGroup.address.PostalCode}
          </small>
          <small>
            {locationGroup.address.Latitude}, {locationGroup.address.Longitude}
          </small>
        </div>
        <div
          className="text-center m-2"
          style={{ height: "2.2rem", width: "2.2rem" }}
          onClick={handleCopyAddress}
        >
          <img
            src={djangoContext.STATIC_URL + "public/clipboard.svg"}
            alt="Copy to clipboard"
            style={{
              maxHeight: "100%",
              height: "1.3rem",
              cursor: "pointer",
            }}
          />
          {clipboardMessage !== null && <span className="text-success">{clipboardMessage}</span>}
        </div>
      </div>

      <hr className="my-2" />

      <div className="fw-bold mb-2" style={{ fontSize: "0.9rem" }}>
        Total Time: {getFormattedEstimatedTime(totalHours)}
      </div>

      <div>
        {sortedDueDates.map((dueDate, idx) => (
          <React.Fragment key={dueDate}>
            <div className="mb-3">
              <div className="fw-bold mb-1">
                {dueDate === "No Due Date"
                  ? "No Due Date"
                  : `Due Date: ${new Date(dueDate).toLocaleDateString()}`}
              </div>
              <ul className="ps-1">
                {jobsByDueDate[dueDate].map((job) => (
                  <li key={job.JobId} className="d-flex justify-content-between align-items-start">
                    <span style={{ flex: 1, marginRight: "8px" }}>
                      {reformatServiceOrderDescription(job.ServiceOrderDescription)}
                    </span>
                    <span className="fw-bold text-nowrap">
                      ({getFormattedEstimatedTime(job.EstimatedTime)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {idx < sortedDueDates.length - 1 && <hr className="my-2" />}
          </React.Fragment>
        ))}
      </div>

      <a
        href={
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeQtAddress(locationGroup.address)
        }
        target="_blank"
        rel="noreferrer"
        className="badge rounded-pill text-bg-primary d-block mt-3"
        style={{ fontSize: "0.9rem" }}
      >
        Open in Google Maps
      </a>
    </div>
  );
}

interface Props {
  groupedByStore: Record<
    number,
    {
      address: SurveyWorkerQtraxWebsiteTypedefsAddress;
      jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
    }
  >;
}

export default function TerritoryMap({ groupedByStore }: Props) {
  const validEntries = Object.entries(groupedByStore).filter(
    ([_, group]) => group.address.StoreName.trim().toLowerCase() !== "no store visit reqd"
  );

  const defaultCenter: LatLngLiteral =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    validEntries[0] !== undefined
      ? {
          lat: validEntries[0][1].address.Latitude,
          lng: validEntries[0][1].address.Longitude,
        }
      : { lat: 40.7, lng: -73.9 };

  return (
    <MapContainer center={defaultCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      {validEntries.map(([siteId, group]) => (
        <Marker
          key={siteId}
          position={{ lat: group.address.Latitude, lng: group.address.Longitude }}
          icon={getCustomIcon("green")}
        >
          <Popup>
            <MapPopupContent locationGroup={group} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
