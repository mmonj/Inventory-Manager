import React from "react";

import Spinner from "react-bootstrap/Spinner";

interface Props {
  size?: "sm" | undefined;
  isBlockElement: boolean;
  className?: string;
  spinnerVariant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
}

export function LoadingSpinner({
  size,
  className = "",
  isBlockElement,
  spinnerVariant = "primary",
}: Props) {
  const displayClassName = isBlockElement === true ? "d-block" : "d-inline-block";

  return (
    <span className={displayClassName + " " + className}>
      <Spinner animation="border" variant={spinnerVariant} role="status" size={size}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </span>
  );
}
