import React from "react";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import {
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
} from "@reactivated";

import { LatLngLiteral } from "leaflet";

import { MapPopupContent } from "./MapPopupContent";
import { getCustomIcon } from "./markerIcons";

interface Props {
  groupedByStore: Record<
    number,
    {
      address: SurveyWorkerQtraxWebsiteTypedefsAddress;
      jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
    }
  >;
  // Accepted for prop-shape parity with TerritoryMapGMaps (the two are meant to be a
  // drop-in swap for each other) - not implemented here.
  repAddress: { repId: number; address: string; lat: number | null; lng: number | null } | null;
}

export default function TerritoryMapLeaflet({ groupedByStore }: Props) {
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
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
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
