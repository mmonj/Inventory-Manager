import React, { useContext, useEffect, useRef, useState } from "react";

import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";

import { Context, reverse } from "@reactivated";

import { faCamera, faKeyboard } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { TScanErrorCallback, TScanSuccessCallback } from "@client/types";

import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Html5QrcodeScannerConfig } from "html5-qrcode/esm/html5-qrcode-scanner";

type navLinkType = "scanner" | "keyboard";
interface IScannerProps {
  scanSuccessCallback: TScanSuccessCallback;
  scanErrorCallback: TScanErrorCallback;
}

function ProductLoggerKeyboard({
  scanSuccessCallback,
}: {
  scanSuccessCallback: TScanSuccessCallback;
}) {
  const upcInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    try {
      const result = await scanSuccessCallback(upcInputRef.current!.value);
      console.log("result:", result);
    } catch (error) {
      console.log("Error:", error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      id="form-manual-upc"
      className="p-3"
      action={reverse("stock_tracker:log_product_scan")}
      method="POST"
    >
      <div className="mb-3">
        <label htmlFor="text-input-upc" className="form-label fw-semibold">
          UPC Number
        </label>
        <input
          ref={upcInputRef}
          id="text-input-upc"
          type="text"
          autoComplete="off"
          className="form-control form-control-lg"
          placeholder="Type a UPC number"
          minLength={12}
          maxLength={12}
          required
        />
      </div>
      <div id="error-manual-upc" className="alert alert-warning" role="alert" hidden></div>
      <Button type="submit" variant="primary" size="lg" className="w-100">
        <FontAwesomeIcon icon={faKeyboard} className="me-2" />
        Submit UPC
      </Button>
    </form>
  );
}

function Html5QrcodePlugin({ scanSuccessCallback, scanErrorCallback }: IScannerProps) {
  const djangoContext = useContext(Context);

  const getScanSound = () =>
    new Audio(djangoContext.STATIC_URL + "public/stock_tracker/scan_sound.ogg");
  const viewportElementId = "scanner-viewport-container";
  const duplicateScanDelayMs = 2000;
  const previousScanInfo = {
    decodedText: "", // UPC
    timeScannedMs: 0,
  };

  function initialScanSuccessCallback(decodedText: string): void {
    if (
      Date.now() - previousScanInfo.timeScannedMs < duplicateScanDelayMs &&
      decodedText === previousScanInfo.decodedText
    ) {
      console.log(`Duplicate UPC has been scanned within the ${duplicateScanDelayMs} ms threshold`);
      return;
    }
    previousScanInfo.decodedText = decodedText;
    previousScanInfo.timeScannedMs = Date.now();

    void (async () => {
      await getScanSound().play();
      console.log(`Sent ${decodedText} to scanSuccessCallback`);
      await scanSuccessCallback(decodedText);
    })();
  }

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
    scanner.render(initialScanSuccessCallback, scanErrorCallback);

    // cleanup function when component will unmount
    return () => {
      console.log("unmounted");
      setTimeout(() => {
        scanner.clear().catch((error) => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }, 1000);
    };
  }, []);

  return <div id={viewportElementId} />;
}

export function BarcodeScanner(props: IScannerProps) {
  const [activeNavLink, setActiveNavLink] = useState<navLinkType>("scanner");

  return (
    <div>
      <Nav className="justify-content-center mb-3" variant="pills">
        <Nav.Item>
          <Nav.Link
            eventKey="scanner"
            active={activeNavLink === "scanner"}
            onClick={() => setActiveNavLink(() => "scanner")}
            className="d-flex align-items-center"
          >
            <FontAwesomeIcon icon={faCamera} className="me-2" />
            Scanner
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="keyboard"
            active={activeNavLink === "keyboard"}
            onClick={() => setActiveNavLink(() => "keyboard")}
            className="d-flex align-items-center"
          >
            <FontAwesomeIcon icon={faKeyboard} className="me-2" />
            Keyboard
          </Nav.Link>
        </Nav.Item>
      </Nav>

      <div className="mt-3">
        {activeNavLink === "scanner" && <Html5QrcodePlugin {...props} />}
        {activeNavLink === "keyboard" && (
          <ProductLoggerKeyboard scanSuccessCallback={props.scanSuccessCallback} />
        )}
      </div>
    </div>
  );
}
