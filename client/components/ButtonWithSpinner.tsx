import React from "react";

import { Spinner } from "react-bootstrap";

interface Props {
  className?: string;
  fetchState: { isLoading: boolean; isError: boolean; errorMessages: string[] };
  type: "button" | "submit" | "reset" | undefined;
  spinnerVariant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  onClick?: () => void;
  children: React.ReactNode;
}

export function ButtonWithSpinner({ className = "", ...props }: Props) {
  return (
    <button className={className} type={props.type} onClick={props.onClick}>
      {props.children}{" "}
      {props.fetchState.isLoading && (
        <span>
          <Spinner
            variant={props.spinnerVariant ?? "primary"}
            animation="border"
            role="status"
            size={"sm"}
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </span>
      )}
    </button>
  );
}
