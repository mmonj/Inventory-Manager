import React from "react";

import {
  Context,
  SurveyWorkerInterfacesIWebhubStore,
  SurveyWorkerInterfacesOnehubModelsMvmPlan,
} from "@reactivated";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import L, { LatLngLiteral } from "leaflet";

import { extractCoordinates } from "@client/util/commonUtil";
import {
  getStoreWorktimeMinutes,
  isHasWebhubStoreNoTickets,
  trimTicketName,
} from "@client/util/surveyWorker";

interface Props {
  stores: SurveyWorkerInterfacesIWebhubStore[];
  filteredTicketIds: Set<string>;
  isHideZeroTickets: boolean;
  currentTickets: SurveyWorkerInterfacesOnehubModelsMvmPlan[];
}

const iconUrls = {
  green:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  red: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
};

function getUserLocationIcon(iconPath: string) {
  return new L.Icon({
    iconUrl: iconPath,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

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

function MapPopupContent(props: {
  store: SurveyWorkerInterfacesIWebhubStore;
  currentTickets: SurveyWorkerInterfacesOnehubModelsMvmPlan[];
  filteredTicketIds: Set<string>;
}) {
  const [clipboardMessage, setClipboardMessage] = React.useState<string | null>(null);
  const djangoContext = React.useContext(Context);

  const [totalProjectTimeMins, thisStoreTickets] = getStoreWorktimeMinutes(
    props.store.current_pending_mplan_ids,
    props.filteredTicketIds,
    props.currentTickets
  );

  function handleCopyAddress() {
    setClipboardMessage(() => "Address Copied!");
    setTimeout(() => {
      setClipboardMessage(() => null);
    }, 2000);

    void navigator.clipboard.writeText(
      `${props.store.City}, ${props.store.State} | ${props.store.Address} | ${props.store.Name}`
    );
  }

  return (
    <>
      <div className="fw-bold h6">{props.store.Name}</div>
      <div className="d-flex justify-content-between">
        <div>
          <span className="d-block" style={{ fontSize: "1rem" }}>
            {props.store.Address}
          </span>
          <small className="d-block" style={{ fontSize: "0.9rem" }}>
            {props.store.City}, {props.store.State} {props.store.Zip}
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
        {Math.floor(totalProjectTimeMins / 60)} hr {totalProjectTimeMins % 60.0} min
      </div>
      <ul className="list-group" style={{ listStyle: "none" }}>
        {thisStoreTickets.map((ticket) => (
          <li key={ticket.ID} className="">
            {trimTicketName(ticket.Name)}{" "}
            <span className="fw-bold">({ticket.EstimatedTime} min)</span>
          </li>
        ))}
      </ul>

      <a
        href={
          "https://www.google.com/maps/place/" +
          encodeURIComponent(
            `${props.store.Address} ${props.store.City}, ${props.store.State} ${props.store.Zip}`
          )
        }
        target="_blank"
        rel="noreferrer"
        className="badge rounded-pill text-bg-primary d-block mt-3"
        style={{ fontSize: "0.9rem" }}
      >
        Open in Google Maps
      </a>
    </>
  );
}

export default function TerritoryMap(props: Props) {
  const [userLocation, setUserLocation] = React.useState<LatLngLiteral | null>(null);
  const djangoContext = React.useContext(Context);

  const intervalLocationMs = 15 * 1000;

  const primaryStore = props.stores.find(
    (store) => !isHasWebhubStoreNoTickets(store, props.filteredTicketIds)
  );

  const firstStoreGeocenter = primaryStore?.GeoCenter ?? "-73.917601, 40.739255";
  const mapCenterCoordinates = extractCoordinates(firstStoreGeocenter);

  const userLocationIcon = getUserLocationIcon(
    djangoContext.STATIC_URL + "public/user-location-icon.png"
  );

  React.useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setUserLocation(() => ({ lat: latitude, lng: longitude }));
    });

    const interVal = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        console.log("Got position");
        const { latitude, longitude } = position.coords;
        setUserLocation(() => ({ lat: latitude, lng: longitude }));
      });
    }, intervalLocationMs);

    return () => {
      clearInterval(interVal);
    };
  }, []);

  return (
    <MapContainer
      center={[mapCenterCoordinates[1], mapCenterCoordinates[0]]}
      zoom={12}
      scrollWheelZoom={true}
      style={{ height: "70vh", marginLeft: "-1rem", marginRight: "-1rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && (
        <Marker position={userLocation} icon={userLocationIcon}>
          <Popup>
            <div className="fw-bold h6">Current Location</div>
            <span className="d-block" style={{ fontSize: "1rem" }}>
              {userLocation.lat}, {userLocation.lng}
            </span>
          </Popup>
        </Marker>
      )}

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
              <MapPopupContent
                currentTickets={props.currentTickets}
                store={store}
                filteredTicketIds={props.filteredTicketIds}
              />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
