import React from "react";

import { Badge } from "react-bootstrap";

import { Context, reverse } from "@reactivated";

import { faBell } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function AlertsBellIcon() {
  const context = React.useContext(Context);
  const unreadCount = context.user.unread_message_count;

  return (
    <a
      href={reverse("root:inbox")}
      className="d-flex align-items-center nav-link position-relative p-0 me-3"
    >
      <FontAwesomeIcon icon={faBell} size="lg" />
      {unreadCount > 0 && (
        <Badge
          bg="danger"
          pill
          className="position-absolute"
          style={
            {
              top: "-6px",
              right: "-8px",
              fontSize: "0.65rem",
              padding: "0.25rem 0.4rem",
              "--bs-bg-opacity": 1,
            } as React.CSSProperties
          }
        >
          {unreadCount}
        </Badge>
      )}
    </a>
  );
}
