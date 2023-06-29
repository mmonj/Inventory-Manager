import React from "react";

import Spinner from "react-bootstrap/Spinner";

interface Props {
  size?: "sm" | undefined;
}

export function LoadingSpinner({ size }: Props) {
  return (
    <div className="d-flex justify-content-center">
      <Spinner animation="border" variant="primary" role="status" size={size}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}
