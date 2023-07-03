import React from "react";

import Spinner from "react-bootstrap/Spinner";

interface Props {
  size?: "sm" | undefined;
  color?: string;
}

export function LoadingSpinner({ size, color }: Props) {
  return (
    <Spinner className={color} animation="border" variant="primary" role="status" size={size}>
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );
}
