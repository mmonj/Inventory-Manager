import React from "react";

import classNames from "classnames";
import { Toast, ToastContainer } from "react-bootstrap";

import { IToast, TToastVariant, subscribeToasts, toast } from "@client/util/toast";

const VARIANT_BG: Record<TToastVariant, string> = {
  success: "success",
  error: "danger",
  info: "info",
  warning: "warning",
};

const VARIANT_TEXT_CLASS: Record<TToastVariant, string> = {
  success: "text-white",
  error: "text-white",
  info: "text-dark",
  warning: "text-dark",
};

const VARIANT_TITLE: Record<TToastVariant, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
  warning: "Warning",
};

// Mounted once at the app root (client/index.tsx)
export function ToastHost() {
  const [toasts, setToasts] = React.useState<IToast[]>([]);

  React.useEffect(() => subscribeToasts(setToasts), []);

  return (
    <ToastContainer
      position="top-end"
      containerPosition="fixed"
      className="p-3"
      style={{ zIndex: 1100 }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} show onClose={() => toast.dismiss(t.id)} bg={VARIANT_BG[t.variant]}>
          <Toast.Header closeButton>
            <strong className="me-auto">{VARIANT_TITLE[t.variant]}</strong>
          </Toast.Header>
          <Toast.Body
            className={classNames("text-dark", {
              "text-white": VARIANT_TITLE[t.variant] == "Warning",
            })}
          >
            {t.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
