import React from "react";

import { Spinner } from "react-bootstrap";

interface Props extends React.PropsWithChildren {
  className?: string;
  fetchState: { isLoading: boolean; isError: boolean; errorMessages: string[] };
  type: "button" | "submit" | "reset" | undefined;
  onClick?: () => void;
}

export function ButtonWithSpinner({ className = "", ...props }: Props) {
  return (
    <button className={className} type={props.type} onClick={props.onClick}>
      {props.children}{" "}
      {props.fetchState.isLoading && (
        <span>
          <Spinner animation="border" variant="primary" role="status" size={"sm"}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </span>
      )}
    </button>
  );
}
