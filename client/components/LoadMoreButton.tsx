import React from "react";

import { Alert } from "react-bootstrap";

import { LoadingSpinner } from "@client/components/LoadingSpinner";

interface Props {
  label: string;
  isLoading: boolean;
  isError: boolean;
  errorMessages: string[];
  onClick: () => void;
  // Whether the caller knows (from the last successful response's pagination info) that
  // there's more to load. When explicitly false, this renders a subtle non-interactive
  // notice instead of a clickable "Load more" button - callers that haven't been updated to
  // pass this yet default to always-clickable (existing behavior).
  hasNext?: boolean;
}

export const LoadMoreButton = React.forwardRef<HTMLDivElement, Props>(
  function LoadMoreButton(props, errorRef) {
    if (props.hasNext === false) {
      return (
        <div className="my-3 text-center text-bold">
          <Alert variant="secondary" className="p-2" style={{ fontWeight: "500" }}>
            There are no more {props.label} to load
          </Alert>
        </div>
      );
    }

    return (
      <div onClick={props.onClick} role="button" className="my-3 text-center text-bold">
        {!props.isLoading && (
          <Alert className="p-2" style={{ fontWeight: "500" }}>
            Load more {props.label}
          </Alert>
        )}
        {props.isLoading && (
          <Alert className="p-2" style={{ fontWeight: "500" }}>
            Loading further {props.label}{" "}
            <LoadingSpinner isBlockElement={false} size={"sm"} className="text-center" />
          </Alert>
        )}
        {props.isError && (
          <Alert ref={errorRef} className="p-2" variant="danger">
            {props.errorMessages.map((msg, index) => (
              <div key={index}>{msg}</div>
            ))}
          </Alert>
        )}
      </div>
    );
  }
);
