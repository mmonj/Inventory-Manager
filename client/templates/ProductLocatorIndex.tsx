import React, { useState } from "react";

import { Context, StoreD7Ddec6B39, interfaces, reverse, templates } from "@reactivated";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { ProductLocatorModal } from "@client/components/productLocator/ProductLocatorModal";
import { useFetch } from "@client/hooks/useFetch";
import { getProductLocation } from "@client/util/productLocator";

export default function Template(props: templates.ProductLocatorIndex) {
  const [store, setStore] = useState<StoreD7Ddec6B39 | null>(null);
  const [scannedUpc, setScannedUpc] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const getProductFetcher = useFetch<interfaces.IProductLocations>();
  const djangoContext = React.useContext(Context);

  // Get store from query param `store-id`
  const storeIdFromQueryParam =
    new URL(djangoContext.request.url).searchParams.get("store-id") ?? "";
  const storeFromQueryParam = props.stores.find(
    (store) => store.pk === parseInt(storeIdFromQueryParam)
  );
  if (storeFromQueryParam !== undefined && storeFromQueryParam.pk !== store?.pk) {
    setStore(() => storeFromQueryParam);
  }

  async function scanSuccessCallback(decodedText: string): Promise<void> {
    console.log("Scanned code:", decodedText);
    setScannedUpc(() => decodedText);

    await getProductFetcher.fetchData(() =>
      getProductLocation(decodedText, store!.pk, reverse("product_locator:get_product_location"))
    );
  }

  function scanErrorCallback(errorMessage: string) {
    console.log("Error occurred on scan. Message:", errorMessage);
  }

  function handleStoreSubmission(storePk: string): void {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("store-id", storePk);
    window.location.href = newUrl.href;
  }

  return (
    <Layout
      title="Product Locator"
      navbar={<NavigationBar />}
      extraStyles={["styles/stock_tracker/scanner.css"]}
    >
      <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
        {!store && (
          <FieldRepStoreSelector
            stores={props.stores}
            propType="stores"
            handleStoreSubmission={handleStoreSubmission}
          />
        )}
        {!!store && (
          <section id="scanner-container" className="mw-rem-60 mx-auto">
            <div id="scanner-store-indicator" className="p-2">
              <h5 className="card-title text-center">{store.name}</h5>
            </div>

            <BarcodeScanner {...{ scanSuccessCallback, scanErrorCallback }} />

            {getProductFetcher.isLoading && (
              <div className="d-flex justify-content-center">
                <LoadingSpinner isBlockElement={true} />
              </div>
            )}
            {getProductFetcher.isError && (
              <Alert variant="danger" className="text-center">
                {getProductFetcher.errorMessages.map((message) => (
                  <div key={crypto.randomUUID()}>{message}</div>
                ))}
              </Alert>
            )}

            <ol id="scanner-results" className="list-group list-group-numbered px-2 mb-2">
              {getProductFetcher.data?.product.home_locations.map((location) => {
                if (location.planogram.date_end !== null) return;

                return (
                  <li
                    key={crypto.randomUUID()}
                    className={"list-group-item d-flex justify-content-between align-items-start"}
                  >
                    <div className="ms-2 me-auto location-container">
                      <div className="fw-bold location-name">{location.name}</div>
                      <div className="fw-bold planogram-name">{location.planogram.name}</div>
                      <div className="product-name">{getProductFetcher.data?.product.name}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <ol id="scanner-results-outdated" className="list-group list-group-numbered px-2">
              {getProductFetcher.data?.product.home_locations.map((location) => {
                if (location.planogram.date_end === null) return;

                return (
                  <li
                    key={crypto.randomUUID()}
                    className={
                      "list-group-item d-flex justify-content-between align-items-start bg-danger"
                    }
                  >
                    <div className="ms-2 me-auto location-container">
                      <div className="fw-bold location-name">{location.name}</div>
                      <div className="fw-bold planogram-name">{location.planogram.name}</div>
                      <div className="product-name">{getProductFetcher.data?.product.name}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {getProductFetcher.data?.product.home_locations.length === 0 && (
              <div className="text-center my-2 alert alert-danger">
                UPC <span className="fw-bold">{getProductFetcher.data.product.upc}</span> not found
                for this store
              </div>
            )}

            {(!!getProductFetcher.data || getProductFetcher.isError) && (
              <div className="my-2 text-center">
                <Button
                  variant="secondary"
                  className="rounded-4"
                  onClick={() => setModalShow(true)}
                >
                  Add location for this UPC
                </Button>
              </div>
            )}
          </section>
        )}
      </section>
      <section>
        {!!store && modalShow && (
          <ProductLocatorModal
            scannedUpc={scannedUpc}
            planograms={props.planograms}
            productName={getProductFetcher.data?.product.name ?? undefined}
            storeId={store.pk}
            modalShow={modalShow}
            onHide={() => setModalShow(() => false)}
          />
        )}
      </section>
    </Layout>
  );
}
