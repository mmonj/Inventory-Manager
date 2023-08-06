import React from "react";

import { Context, Planogram_81F76E013B, reverse } from "@reactivated";
import { Alert } from "react-bootstrap";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import { useFetch } from "@client/hooks/useFetch";
import { postNewProductLocation } from "@client/util/productLocator";
import { ILocationUpdateResponseType } from "@client/util/productLocator/apiInterfaces";

import { LoadingSpinner } from "../LoadingSpinner";

interface Props {
  modalShow: boolean;
  onHide: () => void;
  planograms: Planogram_81F76E013B[];
  scannedUpc: string;
  storeId: number;
}

export function ProductLocatorModal({ modalShow, onHide, planograms, scannedUpc, storeId }: Props) {
  const locUpdateProps = useFetch<ILocationUpdateResponseType>();
  const djangoContext = React.useContext(Context);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const formElm = event.target as HTMLFormElement;

    await locUpdateProps.fetchData(() =>
      postNewProductLocation(formData, formElm, djangoContext.csrf_token)
    );
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
            <p>
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
            </p>
            <p>
              <label htmlFor="planogram-name-update" className="form-label">
                Planogram
              </label>
              <select name="planogram-id" id="planogram-name-update" className="form-select">
                {planograms.map((planogram) => {
                  if (planogram.store?.pk !== storeId) {
                    return null;
                  }
                  return (
                    <option key={planogram.pk} value={planogram.pk}>
                      {planogram.name}
                    </option>
                  );
                })}
              </select>
            </p>
            <p>
              <label htmlFor="location-name-update" className="form-label">
                New Location (eg. A15)
              </label>
              <input
                type="text"
                pattern="[a-zA-Z][0-9]{1,2}"
                name="new-location-name"
                id="location-name-update"
                className="form-control"
                required
              />
            </p>
          </fieldset>
          <div className="d-flex justify-content-center mb-3">
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
              An error occurred. Try again.
            </Alert>
          )}
          {!locUpdateProps.isError && !locUpdateProps.isLoading && locUpdateProps.data && (
            <Alert key={"success"} variant={"success"} className="text-center">
              Submitted successfully!
            </Alert>
          )}
        </form>
      </Modal.Body>
    </Modal>
  );
}
