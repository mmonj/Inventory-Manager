import React, { useContext, useState } from "react";

import {
  Context,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import L, { LatLngLiteral } from "leaflet";

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
  group,
}: {
  group: {
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
      `${group.address.City}, ${group.address.State} | ${group.address.StreetAddress} | ${group.address.StoreName}`
    );
  }

  return (
    <div>
      <div className="fw-bold h6">{group.address.StoreName}</div>
      <div className="d-flex justify-content-between">
        <div>
          <span className="d-block" style={{ fontSize: "1rem" }}>
            {group.address.StreetAddress}
          </span>
          <small className="d-block" style={{ fontSize: "0.9rem" }}>
            {group.address.City}, {group.address.State} {group.address.PostalCode}
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
      <hr />

      <div className="fw-bold mb-1">
        Total Time: {group.jobs.reduce((acc, job) => acc + job.EstimatedTime, 0).toFixed(2)} hrs
      </div>

      <ul className="list-group" style={{ listStyle: "none" }}>
        {group.jobs.map((job, jIdx) => (
          <li key={jIdx}>
            {job.ServiceOrderDescription} <span className="fw-bold">({job.EstimatedTime} hrs)</span>
          </li>
        ))}
      </ul>

      <a
        href={
          "https://www.google.com/maps/place/" +
          encodeURIComponent(
            `${group.address.StreetAddress} ${group.address.City}, ${group.address.State} ${group.address.PostalCode}`
          )
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
    <MapContainer center={defaultCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
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
            <MapPopupContent group={group} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
