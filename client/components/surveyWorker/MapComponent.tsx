import React from "react";

import { SurveyWorkerInterfacesIWebhubStore } from "@reactivated";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import L from "leaflet";

import { extractCoordinates } from "@client/util/commonUtil";
import { isHasWebhubStoreNoTickets } from "@client/util/surveyWorker";

interface Props {
  stores: SurveyWorkerInterfacesIWebhubStore[];
  filteredTicketIds: Set<string>;
  isHideZeroTickets: boolean;
}

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

export default function MapComponent(props: Props) {
  const primaryStore = props.stores.find(
    (store) => !isHasWebhubStoreNoTickets(store, props.filteredTicketIds)
  );
  const mapCenterCoordinates = extractCoordinates(
    primaryStore?.GeoCenter ?? props.stores[0].GeoCenter
  );

  return (
    <MapContainer
      center={[mapCenterCoordinates[1], mapCenterCoordinates[0]]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "70vh", marginLeft: "-1rem", marginRight: "-1rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {props.stores.map((store) => {
        const mapMarkerCoordinates = extractCoordinates(store.GeoCenter);
        let markerColor: keyof typeof iconUrls = "green";
        if (isHasWebhubStoreNoTickets(store, props.filteredTicketIds)) {
          markerColor = "red";
        }

        if (props.isHideZeroTickets && markerColor === "red") return;

        return (
          <Marker
            key={store.ID}
            position={[mapMarkerCoordinates[1], mapMarkerCoordinates[0]]}
            icon={getCustomIcon(markerColor)}
          >
            <Popup>
              <div className="fw-bold h6">{store.Name}</div>
              <span className="d-block" style={{ fontSize: "1rem" }}>
                {store.Address}
              </span>
              <small className="text-body d-block" style={{ fontSize: "0.9rem" }}>
                {store.City}, {store.State} {store.Zip}
              </small>
              <a
                href={
                  "https://www.google.com/maps/place/" +
                  encodeURIComponent(`${store.Address} ${store.City}, ${store.State} ${store.Zip}`)
                }
                target="_blank"
                rel="noreferrer"
                className="badge rounded-pill text-bg-primary d-block mt-3"
                style={{ fontSize: "0.9rem" }}
              >
                Open in Google Maps
              </a>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
