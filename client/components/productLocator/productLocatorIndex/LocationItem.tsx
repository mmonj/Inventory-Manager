import React from "react";
import Badge from "react-bootstrap/Badge";

import { interfaces } from "@reactivated";

import classNames from "classnames";

import type { Color } from "react-bootstrap/types";

type LocationItemProps = {
  location: interfaces.IProductLocations["product"]["home_locations"][number];
  locationType?: "outdated" | "current";
};

export function LocationItem({ location, locationType = "current" }: LocationItemProps) {
  const isSeasonal = location.planogram.plano_type_info.value === "seasonal";

  const variants = {
    current: {
      locationBadgeBg: "primary",
      planogramBadgeBg: "info",
      locationText: "text-dark",
      planoText: "black",
      containerClassName: classNames("list-group-item list-group-item-action", {
        "seasonal-location": isSeasonal,
      }),
    },
    outdated: {
      locationBadgeBg: "danger",
      planogramBadgeBg: "danger",
      locationText: "text-white",
      planoText: "white",
      containerClassName: "list-group-item list-group-item-danger",
    },
  };

  return (
    <div className={variants[locationType].containerClassName}>
      {isSeasonal && locationType === "current" && (
        <div className="seasonal-indicator">
          <span className="seasonal-icon">🎄</span>
          <span className="seasonal-text">SEASONAL</span>
        </div>
      )}
      <div className="d-flex w-100 justify-content-between align-items-start">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center mb-2">
            <Badge
              bg={variants[locationType].locationBadgeBg}
              className="me-2"
              text={variants[locationType].planoText as Color}
            >
              Location
            </Badge>
            <span
              className={classNames("mb-0 fw-bold", { "seasonal-location-name": isSeasonal })}
              style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
            >
              {location.name}
            </span>
          </div>
          <div>
            <Badge
              bg={variants[locationType].planogramBadgeBg}
              className={classNames("me-2", { "seasonal-badge": isSeasonal })}
              text={variants[locationType].planoText as Color}
            >
              {isSeasonal ? "🌟 Seasonal" : "Planogram"}
            </Badge>
            <span className="fw-semibold">{location.planogram.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
