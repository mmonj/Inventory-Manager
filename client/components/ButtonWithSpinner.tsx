import React from "react";

import { Spinner } from "react-bootstrap";

interface Props {
  className?: string;
  fetchState: { isLoading: boolean; isError: boolean; errorMessages: string[] };
  type: "button" | "submit" | "reset" | undefined;
  // Matches react-bootstrap's own Spinner `variant` prop type (a handful of named theme colors,
  // but also accepts any string since it's just applied as a `text-{variant}` class).
  spinnerVariant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark"
    | "black"
    | "white";
  // Extra condition to disable on, on top of fetchState.isLoading (e.g. nothing selected yet).
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function ButtonWithSpinner({ className = "", disabled = false, ...props }: Props) {
  return (
    <button
      className={className}
      type={props.type}
      onClick={props.onClick}
      disabled={disabled || props.fetchState.isLoading}
    >
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
