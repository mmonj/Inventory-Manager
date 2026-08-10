import React from "react";

import { Alert } from "react-bootstrap";

import { LoadingSpinner } from "@client/components/LoadingSpinner";

interface Props {
  label: string;
  isLoading: boolean;
  isError: boolean;
  errorMessages: string[];
  onClick: () => void;
}

export const LoadMoreButton = React.forwardRef<HTMLDivElement, Props>(
  function LoadMoreButton(props, errorRef) {
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
