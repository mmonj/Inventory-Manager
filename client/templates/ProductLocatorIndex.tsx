import React, { createContext, useState } from "react";

import { Context, StoreD7Ddec6B39, reverse, templates } from "@reactivated";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { StoreSelector } from "@client/components/StorePicker";
import { useFetch } from "@client/hooks/useFetch";
import { ProductResponseJsonType, scannerContextType } from "@client/types";
import { fetchGetProductLocation } from "@client/util/productLocatorUtil";

export const ScannerContext = createContext<scannerContextType | null>(null);

export default (props: templates.ProductLocatorIndex) => {
  const [store, setStore] = useState<StoreD7Ddec6B39 | null>(null);
  const [productData, isLoading, isError, fetchCallback] = useFetch<ProductResponseJsonType>();
  const context = React.useContext(Context);

  const storeIdFromQueryParam = new URL(context.request.url).searchParams.get("store-id") ?? "";
  const storeFromQueryParam: StoreD7Ddec6B39 | undefined = props.stores.filter(
    (store) => store.pk === parseInt(storeIdFromQueryParam)
  )[0];
  if (storeFromQueryParam !== undefined && storeFromQueryParam.pk !== store?.pk) {
    setStore(() => storeFromQueryParam);
  }

  async function scanSuccessCallback(decodedText: string): Promise<void> {
    console.log("Scanned code:", decodedText);

    await fetchCallback(() =>
      fetchGetProductLocation(
        decodedText,
        store!.pk,
        reverse("product_locator:get_product_location")
      )
    );
  }

  function scanErrorcallback(errorMessage: string) {
    console.log("Error occurred on scan. Message:", errorMessage);
  }

  return (
    <Layout title="Product Locator">
      <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
        {!store && <StoreSelector stores={props.stores} isFieldRepsDisabled={true} />}
        {!!store && (
          <section id="scanner-container" className="mw-rem-60 mx-auto">
            <div id="scanner-store-indicator" className="p-2">
              <h5 className="card-title text-center title-color">{store.name}</h5>
            </div>

            <ScannerContext.Provider value={{ scanSuccessCallback, scanErrorcallback }}>
              <BarcodeScanner
                scanSuccessCallback={scanSuccessCallback}
                scanErrorCallback={scanErrorcallback}
              />
            </ScannerContext.Provider>
            <ol id="scanner-results" className="list-group list-group-numbered px-2">
              {isLoading && <LoadingSpinner />}
              {isError && <div>Error occurred</div>}
              {productData?.home_locations.map((location) => (
                <li
                  key={crypto.randomUUID()}
                  className="list-group-item d-flex justify-content-between align-items-start">
                  <div className="ms-2 me-auto location-container">
                    <div className="fw-bold location-name">{location.name}</div>
                    <div className="fw-bold planogram-name">{location.planogram}</div>
                    <div className="product-name">{productData.product.name}</div>
                  </div>
                </li>
              ))}
            </ol>
            {!!productData && (
              <div className="my-2 text-center">
                <button
                  className="btn btn-secondary rounded-4"
                  data-bs-toggle="modal"
                  data-bs-target="#modal-add-location">
                  Add location for this UPC
                </button>
              </div>
            )}
          </section>
        )}
      </section>
    </Layout>
  );
};
