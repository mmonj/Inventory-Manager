import React from "react";

import { Alert } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { Context, interfaces, reverse, templates } from "@reactivated";

import {
  faCheckCircle,
  faMapMarkerAlt,
  faPlusCircle,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useFetch } from "@client/hooks/useFetch";
import { postNewProductLocation } from "@client/util/productLocator";
import {
  LOCATION_NAME_INPUT_PATTERN,
  TProductLookupStatus,
} from "@client/util/productLocator/addLocationForm";

import { ErrorAlert } from "../ErrorAlert";
import { LoadingSpinner } from "../LoadingSpinner";
import { CarryoverModal } from "./CarryoverModal";

const FIND_SAME_PRODUCT_LABEL =
  "Find the same product under a different UPC, and copy its name and locations";

interface ICarryoverRequest {
  upc: string;
  initialSearchText: string;
}

interface Props {
  modalShow: boolean;
  onHide: () => void;
  planograms: templates.ProductLocatorScanner["planograms"];
  scannedUpc: string;
  lookupStatus: TProductLookupStatus;
  lookupErrorMessages: string[];
  productName?: string;
  storeId: number;
  onAddSuccess: (upc: string) => void;
  onCarryoverOpenChange: (isOpen: boolean) => void;
  onCarryoverSuccess: (upc: string) => void;
}

export function ProductLocatorModal({
  modalShow,
  onHide,
  planograms,
  scannedUpc,
  lookupStatus,
  lookupErrorMessages,
  productName,
  storeId,
  onAddSuccess,
  onCarryoverOpenChange,
  onCarryoverSuccess,
}: Props) {
  const locUpdateProps = useFetch<interfaces.IHomeLocationUpdate>();
  const djangoContext = React.useContext(Context);
  const [carryoverRequest, setCarryoverRequest] = React.useState<ICarryoverRequest | null>(null);

  // Only a finished lookup that found no Product makes this a new UPC. Anything else keeps the name
  // locked, so a name the server would ignore or a blank one can't be sent as if it counted.
  const isNameEditable = lookupStatus === "not-found" && !locUpdateProps.isLoading;
  const canSubmit = lookupStatus === "found" || lookupStatus === "not-found";

  const productNameRef = React.useRef<HTMLInputElement>(null);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const formElm = event.target as HTMLFormElement;

    await locUpdateProps.fetchData(
      () => postNewProductLocation(formData, formElm, storeId, djangoContext.csrf_token),
      () => onAddSuccess(scannedUpc)
    );
  }

  function handleOpenCarryover(): void {
    setCarryoverRequest({
      upc: scannedUpc,
      initialSearchText: productNameRef.current!.value.trim(),
    });
    onCarryoverOpenChange(true);
  }

  function handleCloseCarryover(): void {
    setCarryoverRequest(null);
    onCarryoverOpenChange(false);
  }

  return (
    <>
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
                  {/* The camera keeps scanning behind this modal, so the lookup can change while it's
                    open. The key remounts the input to pick up the new defaultValue, and leaves
                    typed text alone for as long as there's no stored name to show. */}
                  <input
                    key={productName ?? ""}
                    ref={productNameRef}
                    defaultValue={productName}
                    type="text"
                    name="product-name"
                    id="product-name-location-update"
                    className="form-control form-control-lg"
                    readOnly={!isNameEditable}
                    required
                  />
                  {isNameEditable && (
                    <OverlayTrigger
                      trigger={["hover", "focus"]}
                      overlay={<Tooltip>{FIND_SAME_PRODUCT_LABEL}</Tooltip>}
                    >
                      <Button
                        onClick={handleOpenCarryover}
                        type="button"
                        variant="outline-primary"
                        size="lg"
                        className="px-3"
                        aria-label={FIND_SAME_PRODUCT_LABEL}
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </Button>
                    </OverlayTrigger>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="planogram-name-update" className="form-label fw-semibold">
                  Planogram
                </label>
                <select
                  name="planogram-id"
                  id="planogram-name-update"
                  className="form-select form-select-lg"
                >
                  {planograms.map((planogram) => {
                    if (planogram.store?.pk !== storeId || planogram.is_outdated) {
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
                  type="text"
                  pattern={LOCATION_NAME_INPUT_PATTERN}
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
              <Button type="submit" variant="primary" size="lg" disabled={!canSubmit}>
                <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                Submit Changes
                {locUpdateProps.isLoading && (
                  <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
                )}
              </Button>
            </div>

            {lookupStatus === "failed" && (
              <ErrorAlert errorMessages={lookupErrorMessages} className="mt-3 mb-0" />
            )}
            {locUpdateProps.isError && (
              <ErrorAlert errorMessages={locUpdateProps.errorMessages} className="mt-3 mb-0" />
            )}
            {!locUpdateProps.isError && !locUpdateProps.isLoading && locUpdateProps.data && (
              <Alert variant="success" className="mt-3 mb-0">
                <div className="d-flex align-items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2 fs-5" />
                  <strong>Submitted successfully!</strong>
                </div>
              </Alert>
            )}
          </form>
        </Modal.Body>
      </Modal>
      {carryoverRequest !== null && (
        <CarryoverModal
          upc={carryoverRequest.upc}
          initialSearchText={carryoverRequest.initialSearchText}
          storeId={storeId}
          onHide={handleCloseCarryover}
          onSuccess={() => {
            handleCloseCarryover();
            onCarryoverSuccess(carryoverRequest.upc);
          }}
        />
      )}
    </>
  );
}
