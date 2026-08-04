import React from "react";

import { Toast } from "react-bootstrap";

import { IErrorToast } from "@client/hooks/useErrorToasts";

interface Props {
  toasts: IErrorToast[];
  onDismiss: (id: number) => void;
}

// Renders bare Toast elements (no ToastContainer) so callers can compose these alongside
// other toasts inside a single positioned ToastContainer instead of stacking two containers.
export function ErrorToastStack(props: Props) {
  return (
    <>
      {props.toasts.map((toast) => (
        <Toast
          key={toast.id}
          show
          onClose={() => props.onDismiss(toast.id)}
          delay={5000}
          autohide
          style={{ backgroundColor: "var(--bs-danger)" }}
        >
          <Toast.Header closeButton={true} className="text-dark">
            <strong className="me-auto">{toast.title}</strong>
          </Toast.Header>
          <Toast.Body className="text-dark">
            {toast.messages.map((message, idx) => (
              <div key={idx}>{message}</div>
            ))}
          </Toast.Body>
        </Toast>
      ))}
    </>
  );
}
