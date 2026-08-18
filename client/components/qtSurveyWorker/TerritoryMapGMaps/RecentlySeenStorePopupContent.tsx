import React, { useState } from "react";

import { Button } from "react-bootstrap";

import { interfaces } from "@reactivated";

import { faCopy, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

type TRecentlySeenStore = interfaces.QtTerritoryRepData["recently_seen_stores"][number];

function formatLastSeen(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

export function RecentlySeenStorePopupContent({ store }: { store: TRecentlySeenStore }) {
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const fullAddress = `${store.address_1}, ${store.city}, ${store.state} ${store.zip_code}`;

  function handleCopyAddress() {
    setClipboardMessage("Copied!");
    setTimeout(() => {
      setClipboardMessage(null);
    }, 1500);

    // store.name is already the full formatted name
    void navigator.clipboard.writeText(store.name);
  }

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

      <div className="small text-white my-3">
        Last seen: {store.last_seen !== null ? formatLastSeen(store.last_seen) : "Unknown"}
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
