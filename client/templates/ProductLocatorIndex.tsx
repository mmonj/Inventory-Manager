import React, { useState } from "react";

import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

import { Context, interfaces, reverse, templates } from "@reactivated";

import {
  faCheckCircle,
  faExclamationTriangle,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { ProductLocatorModal } from "@client/components/productLocator/ProductLocatorModal";
import { useFetch } from "@client/hooks/useFetch";
import { getProductLocation } from "@client/util/productLocator";

type TStore = templates.ProductLocatorIndex["stores"][number];

export default function Template(props: templates.ProductLocatorIndex) {
  const [store, setStore] = useState<TStore | null>(null);
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
      <div className="min-vh-100 py-4">
        <section id="store-select-container" className="mw-rem-60 mx-auto px-3">
          {!store && (
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary mb-2">Product Locator</h2>
                  <p className="text-muted">Select a store to scan and locate products</p>
                </div>
                <FieldRepStoreSelector
                  stores={props.stores}
                  propType="stores"
                  handleStoreSubmission={handleStoreSubmission}
                />
              </Card.Body>
            </Card>
          )}
          {!!store && (
            <section id="scanner-container" className="mw-rem-60 mx-auto">
              <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-primary text-white py-3">
                  <h5 className="card-title text-dark text-center mb-0 fw-bold">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    {store.name}
                  </h5>
                </Card.Header>
                <Card.Body className="p-4">
                  <BarcodeScanner {...{ scanSuccessCallback, scanErrorCallback }} />
                </Card.Body>
              </Card>

              {getProductFetcher.isLoading && (
                <Card className="shadow-sm border-0 mb-4">
                  <Card.Body className="p-5">
                    <div className="d-flex flex-column align-items-center">
                      <LoadingSpinner isBlockElement={true} />
                      <p className="text-muted mt-3">Searching for product...</p>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {getProductFetcher.isError && (
                <Alert variant="danger" className="shadow-sm border-0">
                  <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 fs-4" />
                    <div>
                      {getProductFetcher.errorMessages.map((message) => (
                        <div key={crypto.randomUUID()}>{message}</div>
                      ))}
                    </div>
                  </div>
                </Alert>
              )}

              {getProductFetcher.data &&
                getProductFetcher.data.product.home_locations.length > 0 && (
                  <Card className="shadow-sm border-0 mb-4">
                    <Card.Header className="bg-success text-white py-3">
                      <h6 className="mb-0 fw-bold">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        Active Locations
                      </h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <div className="mb-3 pb-2 border-bottom">
                        <strong>Product:</strong> {getProductFetcher.data.product.name}
                      </div>
                      <div className="list-group list-group-flush">
                        {getProductFetcher.data.product.home_locations.map((location) => {
                          if (location.planogram.date_end !== null) return null;

                          return (
                            <div
                              key={crypto.randomUUID()}
                              className="list-group-item list-group-item-action"
                            >
                              <div className="d-flex w-100 justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center mb-2">
                                    <Badge bg="primary" className="me-2">
                                      Location
                                    </Badge>
                                    <h6
                                      className="mb-0 fw-bold"
                                      style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                                    >
                                      {location.name}
                                    </h6>
                                  </div>
                                  <div>
                                    <Badge bg="info" className="me-2">
                                      Planogram
                                    </Badge>
                                    <span className="fw-semibold">{location.planogram.name}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card.Body>
                  </Card>
                )}

              {getProductFetcher.data &&
                getProductFetcher.data.product.home_locations.some(
                  (loc) => loc.planogram.date_end !== null
                ) && (
                  <Card
                    className="shadow-sm border-0 border-danger mb-4"
                    style={{ borderWidth: "2px !important" }}
                  >
                    <Card.Header className="bg-danger text-white py-3">
                      <h6 className="mb-0 fw-bold">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        Outdated Locations
                      </h6>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <div className="mb-3 pb-2 border-bottom">
                        <strong>Product:</strong> {getProductFetcher.data.product.name}
                      </div>
                      <div className="list-group list-group-flush">
                        {getProductFetcher.data.product.home_locations.map((location) => {
                          if (location.planogram.date_end === null) return null;

                          return (
                            <div
                              key={crypto.randomUUID()}
                              className="list-group-item list-group-item-danger"
                            >
                              <div className="d-flex w-100 justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center mb-2">
                                    <Badge bg="dark" className="me-2">
                                      Location
                                    </Badge>
                                    <h6
                                      className="mb-0 fw-bold"
                                      style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                                    >
                                      {location.name}
                                    </h6>
                                  </div>
                                  <div>
                                    <Badge bg="secondary" className="me-2">
                                      Planogram
                                    </Badge>
                                    <span className="fw-semibold">{location.planogram.name}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card.Body>
                  </Card>
                )}

              {getProductFetcher.data?.product.home_locations.length === 0 && (
                <Alert variant="warning" className="shadow-sm border-0 text-center py-4">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    size="2x"
                    className="mb-3 text-warning"
                  />
                  <h5 className="fw-bold mb-2">Product Not Found</h5>
                  <p className="mb-0">
                    UPC{" "}
                    <Badge bg="dark" className="mx-1">
                      {getProductFetcher.data.product.upc}
                    </Badge>{" "}
                    not found for this store
                  </p>
                </Alert>
              )}

              {(!!getProductFetcher.data || getProductFetcher.isError) && (
                <div className="my-4 text-center">
                  <Button
                    variant="primary"
                    size="lg"
                    className="shadow-sm"
                    onClick={() => setModalShow(true)}
                  >
                    <FontAwesomeIcon icon={faPlusCircle} className="me-2" />
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
      </div>
    </Layout>
  );
}
