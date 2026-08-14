import React, { useContext, useEffect, useMemo, useState } from "react";

import { Button } from "react-bootstrap";

import {
  Context,
  SurveyWorkerQtraxWebsiteTypedefsAddress,
  SurveyWorkerQtraxWebsiteTypedefsTServiceOrder,
  reverse,
  templates,
} from "@reactivated";

import { faLocationCrosshairs } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { fetchByReactivated } from "@client/util/commonUtil";

import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";

import { MapPopupContent } from "./MapPopupContent";
import { RecentlySeenStorePopupContent } from "./RecentlySeenStorePopupContent";
import { RepAddressPopupContent, TRepAddressResolved } from "./RepAddressPopupContent";
import {
  CURRENT_LOCATION_MARKER_ICON,
  RECENTLY_SEEN_STORE_MARKER_ICON,
  REP_ADDRESS_MARKER_ICON,
  SERVICE_ORDER_MARKER_ICON,
} from "./markerIcons";

interface TRepAddressInput {
  repId: number;
  address: string;
  // QtRepDetail.address_latitude/longitude - null until geocode_address (below) resolves
  // them, since Google's Geocoding REST API rejects the HTTP-referrer-restricted key used for
  // the browser map, so this can't be pre-resolved server-side (see tasks.update_rep_address).
  lat: number | null;
  lng: number | null;
}

type TRecentlySeenStore =
  templates.QtTerritoryViewer["recently_seen_stores_by_rep"][number]["stores"][number];

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
  // Stores seen recently but no longer in groupedByStore (their SO was already submitted) -
  // rendered as red pins.
  recentlySeenStores: TRecentlySeenStore[];
}

const mapContainerStyle = { height: "100%", width: "100%" };

export default function TerritoryMapGMaps({
  groupedByStore,
  repAddress,
  recentlySeenStores,
}: Props) {
  const context = useContext(Context);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: context.google_maps_js_api_key,
  });
  // A single piece of state for "which marker's InfoWindow is open" - only one popup can be
  // open across all marker types at once, so setting one via setActiveMarker automatically
  // closes whatever was previously open, regardless of type.
  type TActiveMarker =
    | { type: "serviceOrder"; siteId: number }
    | { type: "recentlySeenStore"; storeId: number }
    | { type: "repAddress" };
  const [activeMarker, setActiveMarker] = useState<TActiveMarker | null>(null);
  // Geocoded client-side (see effect below) when repAddress.lat/lng aren't already resolved.
  const [geocodedRepAddress, setGeocodedRepAddress] = useState<TRepAddressResolved | null>(null);
  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Memoized so this doesn't produce a new object reference every render when repAddress
  // already has resolved coordinates - defaultCenter (below) depends on this value, and
  // GoogleMap calls map.setCenter() whenever its `center` prop reference changes, which would
  // otherwise snap the map back after every render (e.g. right after a manual panTo()).
  const resolvedRepAddress: TRepAddressResolved | null = useMemo(() => {
    if (repAddress?.lat !== null && repAddress?.lat !== undefined && repAddress.lng !== null) {
      return { address: repAddress.address, lat: repAddress.lat, lng: repAddress.lng };
    }
    return geocodedRepAddress;
  }, [repAddress?.address, repAddress?.lat, repAddress?.lng, geocodedRepAddress]);

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

  function handleShowMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCurrentLocation(location);
        setLocationError(null);
        map?.panTo(location);
      },
      (error) => {
        setLocationError(`Failed to get your location: ${error.message}`);
      }
    );
  }

  // Keep the blue dot current for as long as the map is mounted
  // Independent of the manual "Show your location" button
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationError(null);
      },
      (error) => {
        setLocationError(`Failed to get your location: ${error.message}`);
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isLoaded]);

  // Auto-request the user's location once, right after the map first mounts and centers on
  // its default (rep address / first service order) - this is a second, follow-up step, not
  // a replacement for that initial centering, so it doesn't touch `defaultCenter` itself.
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    handleShowMyLocation();
  }, [isLoaded]);

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
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={12}
        onLoad={(loadedMap) => setMap(loadedMap)}
        onUnmount={() => setMap(null)}
      >
        {validEntries.map(([siteId, group]) => (
          <Marker
            key={siteId}
            position={{ lat: group.address.Latitude, lng: group.address.Longitude }}
            icon={SERVICE_ORDER_MARKER_ICON}
            onClick={() => setActiveMarker({ type: "serviceOrder", siteId: Number(siteId) })}
          >
            {activeMarker?.type === "serviceOrder" && activeMarker.siteId === Number(siteId) && (
              <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                <MapPopupContent locationGroup={group} />
              </InfoWindow>
            )}
          </Marker>
        ))}
        {recentlySeenStores.map((store) => {
          if (store.latitude === null || store.longitude === null) {
            return null;
          }

          return (
            <Marker
              key={store.id}
              position={{ lat: store.latitude, lng: store.longitude }}
              icon={RECENTLY_SEEN_STORE_MARKER_ICON}
              onClick={() => setActiveMarker({ type: "recentlySeenStore", storeId: store.id })}
            >
              {activeMarker?.type === "recentlySeenStore" && activeMarker.storeId === store.id && (
                <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                  <RecentlySeenStorePopupContent store={store} />
                </InfoWindow>
              )}
            </Marker>
          );
        })}
        {resolvedRepAddress !== null && (
          <Marker
            position={{ lat: resolvedRepAddress.lat, lng: resolvedRepAddress.lng }}
            icon={REP_ADDRESS_MARKER_ICON}
            onClick={() => setActiveMarker({ type: "repAddress" })}
          >
            {activeMarker?.type === "repAddress" && (
              <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                <RepAddressPopupContent repAddress={resolvedRepAddress} />
              </InfoWindow>
            )}
          </Marker>
        )}
        {currentLocation !== null && (
          <Marker position={currentLocation} icon={CURRENT_LOCATION_MARKER_ICON} />
        )}
      </GoogleMap>

      <Button
        variant="dark"
        className="shadow-sm border d-flex align-items-center justify-content-center p-0 rounded-circle"
        style={{
          position: "absolute",
          bottom: "9.0rem",
          right: "0.7rem",
          width: "2.5rem",
          height: "2.5rem",
          zIndex: 1,
        }}
        onClick={handleShowMyLocation}
        title="Show your location"
      >
        <FontAwesomeIcon icon={faLocationCrosshairs} size="lg" />
      </Button>

      {locationError !== null && (
        <div
          className="position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-danger-subtle text-danger-emphasis small rounded"
          style={{ zIndex: 1 }}
        >
          {locationError}
        </div>
      )}
    </div>
  );
}
