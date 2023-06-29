import React from "react";

import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";

export function BasicExample() {
  return (
    <ToastContainer className="p-3" position={"middle-center"} style={{ zIndex: 1 }}>
      <Toast>
        <Toast.Header closeButton={true}>
          <strong className="me-auto">Bootstrap</strong>
          <small>11 mins ago</small>
        </Toast.Header>
        <Toast.Body>Hello, world! This is a toast message.</Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
