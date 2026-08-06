import React, { useContext, useEffect, useMemo, useState } from "react";

import { Badge, Button } from "react-bootstrap";

import {
  Context,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  reverse,
} from "@reactivated";

import { faClock, faCopy, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  encodeQtAddress,
  fetchByReactivated,
  getFormattedEstimatedTime,
  reformatServiceOrderDescription,
} from "@client/util/commonUtil";

import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";

function MapInfoWindowContent({
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

interface TRepAddressInput {
  repId: number;
  address: string;
  // QtRepDetail.address_latitude/longitude - null until geocode_address (below) resolves
  // them, since Google's Geocoding REST API rejects the HTTP-referrer-restricted key used for
  // the browser map, so this can't be pre-resolved server-side (see tasks.update_rep_address).
  lat: number | null;
  lng: number | null;
}

interface TRepAddressResolved {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  groupedByStore: Record<
    number,
    {
      address: SurveyWorkerQtraxWebsiteTypedefsAddress;
      jobs: SurveyWorkerQtraxWebsiteTypedefsTServiceOrder[];
    }
  >;
  // Rep's own home address - used as the fallback map center when the rep has no service
  // orders, and rendered as its own violet marker so it's visually distinct from the green
  // service-order markers. Geocoded client-side on load if lat/lng aren't already resolved.
  repAddress: TRepAddressInput | null;
}

function RepAddressInfoWindowContent({ repAddress }: { repAddress: TRepAddressResolved }) {
  return (
    <div style={{ minWidth: "220px" }}>
      <h6 className="fw-bold text-primary mb-2">Rep Address</h6>
      <div className="small mb-3">{repAddress.address}</div>
      <Button
        href={
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(repAddress.address)
        }
        target="_blank"
        rel="noreferrer"
        variant="primary"
        size="sm"
        className="w-100 text-dark"
      >
        <FontAwesomeIcon icon={faExternalLinkAlt} className="me-2" />
        Open in Google Maps
      </Button>
    </div>
  );
}

const mapContainerStyle = { height: "100%", width: "100%" };
const MARKER_PIN_PATH =
  "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z";

// Icon.anchor is typed against the google.maps.Point *class* (which requires an equals()
// method), but the Maps runtime accepts a plain {x, y} object just fine - a known gap in
// @types/google.maps, hence the `as` cast rather than `satisfies`.
function getMarkerPinIcon(fillColor: string, strokeColor: string): google.maps.Symbol {
  return {
    path: MARKER_PIN_PATH,
    fillColor,
    fillOpacity: 1,
    strokeColor,
    strokeWeight: 1,
    scale: 1.5,
    anchor: { x: 12, y: 22 } as google.maps.Point,
  };
}

const SERVICE_ORDER_MARKER_ICON = getMarkerPinIcon("#22c55e", "#15803d");
const REP_ADDRESS_MARKER_ICON = getMarkerPinIcon("#c052f3", "#b535f1");

export default function TerritoryMapGMaps({ groupedByStore, repAddress }: Props) {
  const context = useContext(Context);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: context.google_maps_js_api_key,
  });
  const [activeSiteId, setActiveSiteId] = useState<number | null>(null);
  const [isRepAddressActive, setIsRepAddressActive] = useState(false);
  // Geocoded client-side (see effect below) when repAddress.lat/lng aren't already resolved.
  const [geocodedRepAddress, setGeocodedRepAddress] = useState<TRepAddressResolved | null>(null);

  const resolvedRepAddress: TRepAddressResolved | null =
    repAddress?.lat !== null && repAddress?.lat !== undefined && repAddress.lng !== null
      ? { address: repAddress.address, lat: repAddress.lat, lng: repAddress.lng }
      : geocodedRepAddress;

  // Geocode the rep's address via the Maps JavaScript SDK's Geocoder (client-side - Google's
  // Geocoding REST API rejects the HTTP-referrer-restricted key this project uses for the
  // browser map, see tasks.update_rep_address) whenever it hasn't been resolved yet, then
  // persist the result so future page loads don't need to re-geocode.
  useEffect(() => {
    if (!isLoaded || repAddress === null || repAddress.lat !== null) {
      return;
    }

    const geocoder = new google.maps.Geocoder();
    void geocoder
      .geocode({ address: repAddress.address })
      .then((result) => {
        if (result.results.length === 0) {
          console.error("Geocoding returned no results for rep address:", repAddress.address);
          return;
        }

        const location = result.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        setGeocodedRepAddress({ address: repAddress.address, lat, lng });

        return fetchByReactivated(
          reverse("survey_worker:qt_save_rep_geocoded_address"),
          context.csrf_token,
          "POST",
          new URLSearchParams({
            rep_id: repAddress.repId.toString(),
            lat: lat.toString(),
            lng: lng.toString(),
          }),
          "application/x-www-form-urlencoded"
        );
      })
      .catch((error: unknown) => {
        console.error("Failed to geocode rep address:", repAddress.address, error);
      });
  }, [isLoaded, repAddress?.repId, repAddress?.address, repAddress?.lat, context.csrf_token]);

  const validEntries = Object.entries(groupedByStore).filter(
    ([_, group]) => group.address.StoreName.trim().toLowerCase() !== "no store visit reqd"
  );

  const firstLat = validEntries[0]?.[1].address.Latitude;
  const firstLng = validEntries[0]?.[1].address.Longitude;

  // GoogleMap treats `center` as a controlled prop - a new object reference (even with the
  // same lat/lng) on every render tells it to recenter, which cancels an in-progress drag and
  // snaps the map back. Memoize on the actual coordinate values so the reference is stable
  // across re-renders that don't change the center. Falls back to the rep's own address when
  // there are no service orders to center on, and a generic NYC-area point after that.
  const defaultCenter = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      firstLat !== undefined && firstLng !== undefined
        ? { lat: firstLat, lng: firstLng }
        : (resolvedRepAddress ?? { lat: 40.7, lng: -73.9 }),
    [firstLat, firstLng, resolvedRepAddress]
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12}>
      {validEntries.map(([siteId, group]) => (
        <Marker
          key={siteId}
          position={{ lat: group.address.Latitude, lng: group.address.Longitude }}
          icon={SERVICE_ORDER_MARKER_ICON}
          onClick={() => setActiveSiteId(Number(siteId))}
        >
          {activeSiteId === Number(siteId) && (
            <InfoWindow onCloseClick={() => setActiveSiteId(null)}>
              <MapInfoWindowContent locationGroup={group} />
            </InfoWindow>
          )}
        </Marker>
      ))}
      {resolvedRepAddress !== null && (
        <Marker
          position={{ lat: resolvedRepAddress.lat, lng: resolvedRepAddress.lng }}
          icon={REP_ADDRESS_MARKER_ICON}
          onClick={() => setIsRepAddressActive(true)}
        >
          {isRepAddressActive && (
            <InfoWindow onCloseClick={() => setIsRepAddressActive(false)}>
              <RepAddressInfoWindowContent repAddress={resolvedRepAddress} />
            </InfoWindow>
          )}
        </Marker>
      )}
    </GoogleMap>
  );
}
