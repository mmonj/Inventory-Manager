import React from "react";

import {
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
            <div>
              <strong>{group.address.StoreName}</strong>
              <br />
              <div>
                {group.address.StreetAddress}, {group.address.City}, {group.address.State}{" "}
                {group.address.PostalCode}
              </div>
              <div>
                {group.address.Latitude}, {group.address.Longitude}
              </div>
              <ul className="mt-2 mb-0 ps-3">
                {group.jobs.map((job, jIdx) => (
                  <li key={jIdx}>
                    {job.ServiceOrderDescription} ({job.EstimatedTime} min)
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
