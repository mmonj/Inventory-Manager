import React from "react";

import { Context, Planogram_0344C0Aff5, interfaces, reverse } from "@reactivated";
import { Alert } from "react-bootstrap";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import { useFetch } from "@client/hooks/useFetch";
import { getRelatedProducts, postNewProductLocation } from "@client/util/productLocator";
import { ILocationUpdateResponseType } from "@client/util/productLocator/apiInterfaces";

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
  const locUpdateProps = useFetch<ILocationUpdateResponseType>();
  const relatedProductsFetch = useFetch<interfaces.MatchingProducts>();
  const djangoContext = React.useContext(Context);

  const productNameRef = React.useRef<HTMLInputElement>(null);
  const relatedProductLocationsDropdownRef = React.useRef<HTMLSelectElement>(null);

  const selectedPlanogramDropdownRef = React.useRef<HTMLSelectElement>(null);
  const newLocationValueRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const formElm = event.target as HTMLFormElement;

    await locUpdateProps.fetchData(() =>
      postNewProductLocation(formData, formElm, djangoContext.csrf_token)
    );
  }

  async function handleSearchRelatedNames() {
    const callback = () => getRelatedProducts(productNameRef.current!.value, storeId);
    await relatedProductsFetch.fetchData(callback);
  }

  function handleChangeRelatedLocationsDropdown(event: React.ChangeEvent<HTMLSelectElement>) {
    const selectedRelatedProductLocationPk = parseInt(event.target.value);
    const selectedRelatedProductLocation = relatedProductsFetch
      .data!.products.map((product) => product.home_locations)
      .flat(1)
      .find((home_location) => home_location.pk === selectedRelatedProductLocationPk);

    if (selectedRelatedProductLocation === undefined) {
      throw new Error("selectedRelatedProductLocation is undefined");
    }

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
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">Add Location</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          onSubmit={handleSubmit}
          action={reverse("product_locator:add_new_product_location")}
          method="POST"
        >
          <fieldset>
            <legend>Location</legend>
            <div className="my-2">
              <label htmlFor="upc-number-location-update" className="form-label">
                UPC Number
              </label>
              <input
                value={scannedUpc}
                type="text"
                name="upc-number"
                id="upc-number-location-update"
                className="form-control"
                readOnly
              />
            </div>
            <div className="my-2">
              <label htmlFor="product-name-location-update" className="form-label">
                Product Name
              </label>
              <div className="d-flex">
                <input
                  ref={productNameRef}
                  defaultValue={productName}
                  type="text"
                  name="product-name"
                  id="product-name-location-update"
                  className="form-control"
                  required
                />
                <Button
                  onClick={handleSearchRelatedNames}
                  type="button"
                  className="mx-1"
                  variant="secondary"
                >
                  {!relatedProductsFetch.isLoading && (
                    <img src={`${djangoContext.STATIC_URL}public/search.svg`} />
                  )}
                  {relatedProductsFetch.isLoading && (
                    <LoadingSpinner isBlockElement={false} size="sm" />
                  )}
                </Button>
              </div>
            </div>

            {relatedProductsFetch.data && (
              <div className="my-2">
                <label htmlFor="related-product-locations" className="form-label">
                  Related Products &amp; Locations
                </label>
                <select
                  onChange={handleChangeRelatedLocationsDropdown}
                  ref={relatedProductLocationsDropdownRef}
                  name="related-product-locations"
                  id="related-product-locations"
                  className="form-select"
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

            <div className="my-2">
              <label htmlFor="planogram-name-update" className="form-label">
                Planogram
              </label>
              <select
                ref={selectedPlanogramDropdownRef}
                name="planogram-id"
                id="planogram-name-update"
                className="form-select"
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
            <div className="my-2">
              <label htmlFor="location-name-update" className="form-label">
                New Location (eg. A15)
              </label>
              <input
                ref={newLocationValueRef}
                type="text"
                pattern="[a-zA-Z][0-9]{1,2}"
                name="new-location-name"
                id="location-name-update"
                className="form-control"
                required
              />
            </div>
          </fieldset>
          <div className="d-flex justify-content-center my-3">
            <Button variant="secondary" className="mx-1" onClick={onHide}>
              Close
            </Button>
            <Button type="submit" className="mx-1" variant="primary">
              Submit Changes&nbsp;
              {locUpdateProps.isLoading && (
                <LoadingSpinner isBlockElement={false} color="text-light" size="sm" />
              )}
            </Button>
          </div>

          {locUpdateProps.isError && (
            <Alert key={"danger"} variant={"danger"} className="text-center">
              {locUpdateProps.errorMessages.map((msg) => (
                <div key={crypto.randomUUID()}>{msg}</div>
              ))}
            </Alert>
          )}
          {!locUpdateProps.isError && !locUpdateProps.isLoading && locUpdateProps.data && (
            <Alert key={"success"} variant={"success"} className="text-center">
              Submitted successfully!
            </Alert>
          )}

          {relatedProductsFetch.isError && (
            <Alert key={"danger"} variant={"danger"} className="text-center">
              {relatedProductsFetch.errorMessages.map((msg) => (
                <div key={crypto.randomUUID()}>{msg}</div>
              ))}
            </Alert>
          )}
        </form>
      </Modal.Body>
    </Modal>
  );
}
