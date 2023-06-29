import React, { useState } from "react";

import { Html5QrcodeResult } from "html5-qrcode";

import { BarcodeScanner } from "./BarcodeScanner";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  storeId: number;
  storeName: string;
}

export function ProductLocatorScanner({ storeId, storeName }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  function scanSuccessCallback(decodedText: string, result: Html5QrcodeResult) {
    console.log("Scanned code:", decodedText);
    console.log("Full scan results:", result);
  }

  function scanErrorcallback(errorMessage: string) {
    console.log("Error occurred on scan. Message:", errorMessage);
  }

  return (
    <section id="scanner-container" className="mw-rem-60 mx-auto">
      <div id="scanner-store-indicator" className="p-2">
        <h5 className="card-title text-center title-color">{storeName}</h5>
      </div>

      <BarcodeScanner
        scanSuccessCallback={scanSuccessCallback}
        scanErrorCallback={scanErrorcallback}
      />
      <ol id="scanner-results" className="list-group list-group-numbered px-2">
        {isLoading && <LoadingSpinner />}
      </ol>
    </section>
  );
}
