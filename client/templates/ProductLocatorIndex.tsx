import React, { createContext, useState } from "react";

import { Context, StoreD7Ddec6B39, reverse, templates } from "@reactivated";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { NavbarProductLocator } from "@client/components/NavbarProductLocator";
import { ProductLocatorModal } from "@client/components/ProductLocatorModal";
import { StoreSelector } from "@client/components/StorePicker";
import { useFetch } from "@client/hooks/useFetch";
import { ProductResponseType, scannerContextType } from "@client/types";
import { getProductLocation } from "@client/util/productLocatorUtil";

export const ScannerContext = createContext<scannerContextType | null>(null);

export default (props: templates.ProductLocatorIndex) => {
  const [store, setStore] = useState<StoreD7Ddec6B39 | null>(null);
  const [scannedUpc, setScannedUpc] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const getProductProps = useFetch<ProductResponseType>();
  const djangoContext = React.useContext(Context);

  // Get store from query param `store-id`
  const storeIdFromQueryParam =
    new URL(djangoContext.request.url).searchParams.get("store-id") ?? "";
  const storeFromQueryParam: StoreD7Ddec6B39 | undefined = props.stores.filter(
    (store) => store.pk === parseInt(storeIdFromQueryParam)
  )[0];
  if (storeFromQueryParam !== undefined && storeFromQueryParam.pk !== store?.pk) {
    setStore(() => storeFromQueryParam);
  }

  async function scanSuccessCallback(decodedText: string): Promise<void> {
    console.log("Scanned code:", decodedText);
    setScannedUpc(() => decodedText);

    await getProductProps.fetchData(() =>
      getProductLocation(decodedText, store!.pk, reverse("product_locator:get_product_location"))
    );
  }

  function scanErrorCallback(errorMessage: string) {
    console.log("Error occurred on scan. Message:", errorMessage);
  }

  return (
    <Layout title="Product Locator" navbarComponent={<NavbarProductLocator />}>
      <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
        {!store && <StoreSelector stores={props.stores} isFieldRepsDisabled={true} />}
        {!!store && (
          <section id="scanner-container" className="mw-rem-60 mx-auto">
            <div id="scanner-store-indicator" className="p-2">
              <h5 className="card-title text-center title-color">{store.name}</h5>
            </div>

            <ScannerContext.Provider value={{ scanSuccessCallback, scanErrorCallback }}>
              <BarcodeScanner />
            </ScannerContext.Provider>
            <ol id="scanner-results" className="list-group list-group-numbered px-2">
              {getProductProps.isLoading && (
                <div className="d-flex justify-content-center">
                  <LoadingSpinner />
                </div>
              )}
              {getProductProps.isError && (
                <Alert variant="danger" className="text-center">
                  An Error Occurred!
                </Alert>
              )}
              {getProductProps.data?.home_locations.map((location) => (
                <li
                  key={crypto.randomUUID()}
                  className="list-group-item d-flex justify-content-between align-items-start">
                  <div className="ms-2 me-auto location-container">
                    <div className="fw-bold location-name">{location.name}</div>
                    <div className="fw-bold planogram-name">{location.planogram}</div>
                    <div className="product-name">{getProductProps.data!.product.name}</div>
                  </div>
                </li>
              ))}
            </ol>
            {!!getProductProps.data && (
              <div className="my-2 text-center">
                <Button
                  variant="secondary"
                  className="rounded-4"
                  onClick={() => setModalShow(true)}>
                  Add location for this UPC
                </Button>
              </div>
            )}
          </section>
        )}
      </section>
      <section>
        {!!store && (
          <ProductLocatorModal
            scannedUpc={scannedUpc}
            planograms={props.planograms}
            storeId={store.pk}
            modalShow={modalShow}
            onHide={() => setModalShow(() => false)}
          />
        )}
      </section>
    </Layout>
  );
};
