import React from "react";

import Spinner from "react-bootstrap/Spinner";

interface Props {
  size?: "sm" | undefined;
  color?: string;
  isBlockElement: boolean;
  className?: string;
}

export function LoadingSpinner({ size, color, className = "", isBlockElement }: Props) {
  const displayClassName = isBlockElement === true ? "d-block" : "d-inline-block";

  return (
    <span className={displayClassName + " " + className}>
      <Spinner className={color} animation="border" variant="primary" role="status" size={size}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </span>
  );
}
