import React from "react";

import { Alert } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import { Context, Planogram_0344C0Aff5, interfaces, reverse } from "@reactivated";

import {
  faCheckCircle,
  faExclamationTriangle,
  faMapMarkerAlt,
  faPlusCircle,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useFetch } from "@client/hooks/useFetch";
import { getRelatedProducts, postNewProductLocation } from "@client/util/productLocator";

import { LoadingSpinner } from "../LoadingSpinner";

interface Props {
  modalShow: boolean;
  onHide: () => void;
  planograms: Planogram_0344C0Aff5[];
  scannedUpc: string;
  productName?: string;
  storeId: number;
}

export function ProductLocatorModal({
  modalShow,
  onHide,
  planograms,
  scannedUpc,
  productName,
  storeId,
}: Props) {
  const locUpdateProps = useFetch<interfaces.IHomeLocationUpdate>();
  const relatedProductsFetch = useFetch<interfaces.MatchingProducts>();
  const djangoContext = React.useContext(Context);

  const productNameRef = React.useRef<HTMLInputElement>(null);
  const relatedProductLocationsDropdownRef = React.useRef<HTMLSelectElement>(null);

  const selectedPlanogramDropdownRef = React.useRef<HTMLSelectElement>(null);
  const newLocationValueRef = React.useRef<HTMLInputElement>(null);

  const relatedProductLocationsFromFetch =
    relatedProductsFetch.data?.products.map((product) => product.home_locations).flat(1) ?? [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const formElm = event.target as HTMLFormElement;

    await locUpdateProps.fetchData(() =>
      postNewProductLocation(formData, formElm, djangoContext.csrf_token)
    );
  }

  async function handleSearchRelatedNames(): Promise<void> {
    const productNameQuery = productNameRef.current!.value.trim();
    if (productNameQuery === "") return;

    const callback = () => getRelatedProducts(productNameQuery, storeId);
    await relatedProductsFetch.fetchData(callback);
  }

  function handleChangeRelatedLocationsDropdown(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedRelatedProductLocationPk = parseInt(event.target.value);

    const selectedRelatedProduct = relatedProductsFetch.data?.products.find((product) =>
      product.home_locations.some(
        (home_location) => home_location.pk === selectedRelatedProductLocationPk
      )
    );

    if (selectedRelatedProduct === undefined) {
      throw new Error("selectedRelatedProduct is undefined");
    }

    const selectedRelatedProductLocation = relatedProductLocationsFromFetch.find(
      (home_location) => home_location.pk === selectedRelatedProductLocationPk
    );

    if (selectedRelatedProductLocation === undefined) {
      throw new Error("selectedRelatedProductLocation is undefined");
    }

    productNameRef.current!.value = selectedRelatedProduct.name!;
    selectedPlanogramDropdownRef.current!.value =
      selectedRelatedProductLocation.planogram.pk.toString();
    newLocationValueRef.current!.value = selectedRelatedProductLocation.name;
  }

  return (
    <Modal
      show={modalShow}
      onHide={onHide}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title id="contained-modal-title-vcenter">
          <FontAwesomeIcon icon={faPlusCircle} className="me-2" />
          Add Location
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <form
          onSubmit={handleSubmit}
          action={reverse("product_locator:add_new_product_location")}
          method="POST"
        >
          <fieldset>
            <legend className="h5 mb-3">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-primary" />
              Location Details
            </legend>
            <div className="mb-3">
              <label htmlFor="upc-number-location-update" className="form-label fw-semibold">
                UPC Number
              </label>
              <input
                value={scannedUpc}
                type="text"
                name="upc-number"
                id="upc-number-location-update"
                className="form-control form-control-lg"
                readOnly
              />
            </div>
            <div className="mb-3">
              <label htmlFor="product-name-location-update" className="form-label fw-semibold">
                Product Name
              </label>
              <div className="d-flex gap-2">
                <input
                  ref={productNameRef}
                  defaultValue={productName}
                  type="text"
                  name="product-name"
                  id="product-name-location-update"
                  className="form-control form-control-lg"
                  required
                />
                <Button
                  onClick={handleSearchRelatedNames}
                  type="button"
                  variant="outline-primary"
                  size="lg"
                  className="px-3"
                  title="Search for related products"
                >
                  {!relatedProductsFetch.isLoading && <FontAwesomeIcon icon={faSearch} />}
                  {relatedProductsFetch.isLoading && (
                    <LoadingSpinner isBlockElement={false} size="sm" />
                  )}
                </Button>
              </div>
            </div>

            {relatedProductsFetch.data && (
              <div className="mb-3 p-3 bg-light rounded">
                <label htmlFor="related-product-locations" className="form-label fw-semibold">
                  Related Products &amp; Locations
                  <span className="badge bg-primary ms-2">
                    {relatedProductLocationsFromFetch.length}
                  </span>
                </label>
                <select
                  onChange={handleChangeRelatedLocationsDropdown}
                  ref={relatedProductLocationsDropdownRef}
                  name="related-product-locations"
                  id="related-product-locations"
                  className="form-select form-select-lg"
                  style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                  defaultValue={"-1"}
                >
                  <option value="-1" disabled>
                    Select an option
                  </option>
                  {relatedProductsFetch.data.products.map((product) =>
                    product.home_locations.map((home_location) => (
                      <option key={home_location.pk} value={home_location.pk}>
                        {product.name} - {home_location.display_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="planogram-name-update" className="form-label fw-semibold">
                Planogram
              </label>
              <select
                ref={selectedPlanogramDropdownRef}
                name="planogram-id"
                id="planogram-name-update"
                className="form-select form-select-lg"
              >
                {planograms.map((planogram) => {
                  if (planogram.store?.pk !== storeId || planogram.date_end !== null) {
                    return;
                  }
                  return (
                    <option key={planogram.pk} value={planogram.pk}>
                      {planogram.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="location-name-update" className="form-label fw-semibold">
                New Location
                <small className="text-muted ms-2">(e.g. A15)</small>
              </label>
              <input
                ref={newLocationValueRef}
                type="text"
                pattern="[a-zA-Z][0-9]{1,2}"
                name="new-location-name"
                id="location-name-update"
                className="form-control form-control-lg"
                style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
                placeholder="Location"
                required
              />
            </div>
          </fieldset>
          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Button variant="outline-secondary" size="lg" onClick={onHide}>
              <FontAwesomeIcon icon={faTimes} className="me-2" />
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="lg">
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
              Submit Changes
              {locUpdateProps.isLoading && (
                <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
              )}
            </Button>
          </div>

          {locUpdateProps.isError && (
            <Alert variant="danger" className="mt-3 mb-0">
              <div className="d-flex align-items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 fs-5" />
                <div>
                  {locUpdateProps.errorMessages.map((msg) => (
                    <div key={crypto.randomUUID()}>{msg}</div>
                  ))}
                </div>
              </div>
            </Alert>
          )}
          {!locUpdateProps.isError && !locUpdateProps.isLoading && locUpdateProps.data && (
            <Alert variant="success" className="mt-3 mb-0">
              <div className="d-flex align-items-center">
                <FontAwesomeIcon icon={faCheckCircle} className="me-2 fs-5" />
                <strong>Submitted successfully!</strong>
              </div>
            </Alert>
          )}

          {relatedProductsFetch.isError && (
            <Alert variant="danger" className="mt-3 mb-0">
              <div className="d-flex align-items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 fs-5" />
                <div>
                  {relatedProductsFetch.errorMessages.map((msg) => (
                    <div key={crypto.randomUUID()}>{msg}</div>
                  ))}
                </div>
              </div>
            </Alert>
          )}
        </form>
      </Modal.Body>
    </Modal>
  );
}
