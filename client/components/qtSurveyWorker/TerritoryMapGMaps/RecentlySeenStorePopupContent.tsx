import React from "react";

import { Button } from "react-bootstrap";

import { templates } from "@reactivated";

import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type TRecentlySeenStore =
  templates.QtTerritoryViewer["recently_seen_stores_by_rep"][number]["stores"][number];

function formatLastSeen(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

export function RecentlySeenStorePopupContent({ store }: { store: TRecentlySeenStore }) {
  const fullAddress = `${store.address_1}, ${store.city}, ${store.state} ${store.zip_code}`;

  return (
    <div style={{ minWidth: "240px" }}>
      <div className="mb-2">
        <h6 className="fw-bold text-primary mb-1">{store.name}</h6>
        <div className="small text-white">
          <div>{store.address_1}</div>
          <div>
            {store.city}, {store.state} {store.zip_code}
          </div>
        </div>
      </div>

      <div className="small text-white mb-3">
        Last seen: {store.last_seen !== null ? formatLastSeen(store.last_seen) : "Unknown"}
        <div className="text-white-50">Not in the current schedule - likely already submitted.</div>
      </div>

      <Button
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
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
