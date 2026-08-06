import React from "react";

import { Button } from "react-bootstrap";

import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface TRepAddressResolved {
  address: string;
  lat: number;
  lng: number;
}

export function RepAddressPopupContent({ repAddress }: { repAddress: TRepAddressResolved }) {
  return (
    <div style={{ minWidth: "220px" }}>
      <h6 className="fw-bold text-primary mb-2">Rep Address</h6>
      <div className="small mb-3 text-white">{repAddress.address}</div>
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
