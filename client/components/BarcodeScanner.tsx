import React, { useContext, useEffect, useRef, useState } from "react";

import { Context, reverse } from "@reactivated";

import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Html5QrcodeScannerConfig } from "html5-qrcode/esm/html5-qrcode-scanner";
import Nav from "react-bootstrap/Nav";

import { TScanErrorCallback, TScanSuccessCallback } from "@client/types";

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
      className="mx-2"
      action={reverse("stock_tracker:log_product_scan")}
      method="POST"
    >
      <label htmlFor="text-input-upc" className="d-block my-2">
        UPC Number
      </label>
      <input
        ref={upcInputRef}
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

      {activeNavLink === "scanner" && <Html5QrcodePlugin {...props} />}
      {activeNavLink === "keyboard" && (
        <ProductLoggerKeyboard scanSuccessCallback={props.scanSuccessCallback} />
      )}
    </>
  );
}
