import React, { useEffect, useState } from "react";

import { reverse } from "@reactivated";

import {
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
  QrcodeErrorCallback,
  QrcodeSuccessCallback,
} from "html5-qrcode";
import { Html5QrcodeScannerConfig } from "html5-qrcode/esm/html5-qrcode-scanner";
import Nav from "react-bootstrap/Nav";

interface ScannerPluginProps {
  scanSuccessCallback: QrcodeSuccessCallback;
  scanErrorCallback: QrcodeErrorCallback;
}

interface BarcodeScannerProps {
  scanSuccessCallback: QrcodeSuccessCallback;
  scanErrorCallback: QrcodeErrorCallback;
}

type navLinkType = "scanner" | "keyboard";

function ProductLoggerKeyboard() {
  return (
    <form id="form-manual-upc" action={reverse("logger:log_product_scan")} method="POST">
      <label htmlFor="text-input-upc" className="d-block my-2">
        UPC Number
      </label>
      <input
        id="text-input-upc"
        type="text"
        autoComplete="off"
        className="form-control mb-3"
        placeholder="Type a UPC number"
        minLength={12}
        maxLength={12}
        required
      />
      <div id="error-manual-upc" className="alert alert-warning" role="alert" hidden></div>
      <button type="submit" className="btn btn-primary form-control mb-2">
        Submit
      </button>
    </form>
  );
}

export function Html5QrcodePlugin({ scanSuccessCallback, scanErrorCallback }: ScannerPluginProps) {
  const viewportElementId = "scanner-viewport-container";

  useEffect(() => {
    // when component mounts
    const config: Html5QrcodeScannerConfig = {
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 2.0,
      fps: 2,
      // qrbox: QrDimensionFunction,
      formatsToSupport: [Html5QrcodeSupportedFormats.UPC_A],
      useBarCodeDetectorIfSupported: true,
      videoConstraints: {
        facingMode: "environment",
      },
    };

    const scanner = new Html5QrcodeScanner(viewportElementId, config, true);
    scanner.render(scanSuccessCallback, scanErrorCallback);

    // cleanup function when component will unmount
    return () => {
      scanner.clear().catch((error) => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, []);

  return <div id={viewportElementId} />;
}

export function BarcodeScanner({ scanSuccessCallback, scanErrorCallback }: BarcodeScannerProps) {
  const [activeNavLink, setActiveNavLink] = useState<navLinkType>("scanner");

  return (
    <>
      <Nav className="justify-content-center" variant="tabs" defaultActiveKey="scanner">
        <Nav.Item>
          <Nav.Link eventKey="scanner" onClick={() => setActiveNavLink(() => "scanner")}>
            Scanner
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="keyboard" onClick={() => setActiveNavLink(() => "keyboard")}>
            Keyboard
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {activeNavLink === "scanner" && (
        <Html5QrcodePlugin
          scanSuccessCallback={scanSuccessCallback}
          scanErrorCallback={scanErrorCallback}
        />
      )}
      {activeNavLink === "keyboard" && <ProductLoggerKeyboard />}
    </>
  );
}
