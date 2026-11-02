import React from "react";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import ListGroup from "react-bootstrap/ListGroup";
import Modal from "react-bootstrap/Modal";

import { Context, interfaces } from "@reactivated";

import {
  faCheckCircle,
  faExclamationTriangle,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useFetch } from "@client/hooks/useFetch";
import { getRelatedProducts, postHomeLocationCarryover } from "@client/util/productLocator";
import { getPlanogramsFromHomeLocations } from "@client/util/productLocator/planogramUtil";

import { LoadingSpinner } from "../LoadingSpinner";

import "@client/scss/product_locator/carryover-modal.scss";

type TMatchingProduct = interfaces.MatchingProducts["products"][number];

interface Props {
  upc: string;
  initialSearchText: string;
  storeId: number;
  onHide: () => void;
  onSuccess: () => void;
}

function CarryoverErrors({ errorMessages }: { errorMessages: string[] }) {
  return (
    <Alert variant="danger" className="mb-3">
      <div className="d-flex align-items-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 fs-5" />
        <div>
          {errorMessages.map((message, index) => (
            <div key={index}>{message}</div>
          ))}
        </div>
      </div>
    </Alert>
  );
}

export function CarryoverModal({ upc, initialSearchText, storeId, onHide, onSuccess }: Props) {
  const searchFetch = useFetch<interfaces.MatchingProducts>();
  const carryoverFetch = useFetch<interfaces.IProductLocatorProduct>();
  const djangoContext = React.useContext(Context);

  const [searchText, setSearchText] = React.useState(initialSearchText);
  const [olderProduct, setOlderProduct] = React.useState<TMatchingProduct | null>(null);
  const [tickedPlanogramIds, setTickedPlanogramIds] = React.useState<number[]>([]);

  const planograms = getPlanogramsFromHomeLocations(olderProduct?.home_locations ?? []);

  async function search(productName: string): Promise<void> {
    setOlderProduct(null);
    setTickedPlanogramIds([]);
    await searchFetch.fetchData(() => getRelatedProducts(productName, storeId));
  }

  React.useEffect(() => {
    const initialProductName = initialSearchText.trim();
    if (initialProductName !== "") {
      void search(initialProductName);
    }
  }, []);

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const productName = searchText.trim();
    if (productName === "") return;

    await search(productName);
  }

  function handlePickProduct(product: TMatchingProduct): void {
    setOlderProduct(product);
    setTickedPlanogramIds(
      getPlanogramsFromHomeLocations(product.home_locations).map((planogram) => planogram.pk)
    );
  }

  function handleTogglePlanogram(planogramId: number, isTicked: boolean): void {
    setTickedPlanogramIds((previousIds) =>
      isTicked ? [...previousIds, planogramId] : previousIds.filter((id) => id !== planogramId)
    );
  }

  async function handleCarryoverSubmit(): Promise<void> {
    await carryoverFetch.fetchData(
      () =>
        postHomeLocationCarryover(
          upc,
          olderProduct!.pk,
          tickedPlanogramIds,
          storeId,
          djangoContext.csrf_token
        ),
      onSuccess
    );
  }

  return (
    <Modal
      show
      onHide={onHide}
      size="lg"
      aria-labelledby="carryover-modal-title"
      centered
      className="carryover-modal"
      backdropClassName="carryover-modal-backdrop"
    >
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title id="carryover-modal-title">
          <FontAwesomeIcon icon={faSearch} className="me-2" />
          Find the Same Product
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <p className="text-muted">
          Copying a name and locations to UPC <strong>{upc}</strong>
        </p>
        <form onSubmit={handleSearchSubmit} className="d-flex gap-2 mb-3">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            type="text"
            className="form-control form-control-lg"
            placeholder="Search by product name"
            aria-label="Search by product name"
          />
          <Button type="submit" variant="outline-primary" size="lg" className="px-3">
            {searchFetch.isLoading ? (
              <LoadingSpinner isBlockElement={false} size="sm" />
            ) : (
              <FontAwesomeIcon icon={faSearch} />
            )}
          </Button>
        </form>

        {searchFetch.isError && <CarryoverErrors errorMessages={searchFetch.errorMessages} />}

        {searchFetch.data?.products.length === 0 && (
          <Alert variant="secondary" className="mb-3">
            No products with a current planogram at this store match that name. Cancel to type the
            name yourself.
          </Alert>
        )}

        {searchFetch.data && (
          <ListGroup className="mb-3">
            {searchFetch.data.products.map((product) => (
              <ListGroup.Item
                key={product.pk}
                action
                type="button"
                active={product.pk === olderProduct?.pk}
                onClick={() => handlePickProduct(product)}
              >
                <div className="fw-semibold">{product.name}</div>
                <small>UPC {product.upc}</small>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        {olderProduct !== null && (
          <fieldset className="mb-3">
            <legend className="h6">Planograms to join</legend>
            {planograms.map((planogram) => (
              <Form.Check
                key={planogram.pk}
                type="checkbox"
                id={`carryover-planogram-${planogram.pk}`}
                label={planogram.name}
                checked={tickedPlanogramIds.includes(planogram.pk)}
                onChange={(event) => handleTogglePlanogram(planogram.pk, event.target.checked)}
              />
            ))}
          </fieldset>
        )}

        {carryoverFetch.isError && <CarryoverErrors errorMessages={carryoverFetch.errorMessages} />}

        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <Button variant="outline-secondary" size="lg" onClick={onHide}>
            <FontAwesomeIcon icon={faTimes} className="me-2" />
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={tickedPlanogramIds.length === 0 || carryoverFetch.isLoading}
            onClick={handleCarryoverSubmit}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
            Submit
            {carryoverFetch.isLoading && (
              <LoadingSpinner isBlockElement={false} spinnerVariant="light" size="sm" />
            )}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
