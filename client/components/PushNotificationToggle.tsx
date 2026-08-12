import React from "react";

import { Button } from "react-bootstrap";

import { faBell, faBellSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { usePushNotifications } from "@client/hooks/usePushNotifications";

export function PushNotificationToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (permission === "unsupported") {
    return null;
  }

  if (permission === "denied") {
    return (
      <div className="text-muted small">
        <FontAwesomeIcon icon={faBellSlash} className="me-1" />
        Notifications are blocked for this site in your browser settings.
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        disabled={isLoading}
        onClick={() => void unsubscribe()}
      >
        <FontAwesomeIcon icon={faBellSlash} className="me-1" />
        Disable Notifications on This Device
      </Button>
    );
  }

  return (
    <Button variant="primary" size="sm" disabled={isLoading} onClick={() => void subscribe()}>
      <FontAwesomeIcon icon={faBell} className="me-1" />
      Enable Notifications on This Device
    </Button>
  );
}
