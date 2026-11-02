import React, { useContext, useEffect } from "react";

import { Context, interfaces, reverse } from "@reactivated";
import { Badge, Modal, Table } from "react-bootstrap";

import { faExclamationTriangle, faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ErrorAlert } from "@client/components/ErrorAlert";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";

interface Props {
  onHide: () => void;
  planogramId: number;
  planogramName: string;
  storeName: string;
  hasPendingUpdate: boolean;
}

export function PlanogramProductsModal(props: Props) {
  const djangoContext = useContext(Context);
  const productsFetcher = useFetch<interfaces.IPlanogramProducts>();
  const planogramProducts = productsFetcher.data;

  useEffect(() => {
    void productsFetcher.fetchData(() =>
      fetchByReactivated<interfaces.IPlanogramProducts>(
        reverse("product_locator:get_planogram_products", { planogram_id: props.planogramId }),
        djangoContext.csrf_token,
        "GET"
      )
    );
  }, []);

  return (
    <Modal show={true} onHide={props.onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="bg-primary text-white">
        <div>
          <Modal.Title>
            <FontAwesomeIcon icon={faList} className="me-2" />
            Products in {props.planogramName}
            {props.storeName !== "" && ` (${props.storeName})`}
          </Modal.Title>
          {planogramProducts !== null && (
            <small>
              {planogramProducts.num_products} product
              {planogramProducts.num_products !== 1 ? "s" : ""} · {planogramProducts.num_locations}{" "}
              location{planogramProducts.num_locations !== 1 ? "s" : ""}
            </small>
          )}
        </div>
      </Modal.Header>
      <Modal.Body className="p-3">
        {props.hasPendingUpdate && (
          <a href={reverse("product_locator:planogram_updates")} className="d-inline-block mb-3">
            <Badge bg="warning">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />1 Pending Plano
              Update
            </Badge>
          </a>
        )}

        {productsFetcher.isError && <ErrorAlert errorMessages={productsFetcher.errorMessages} />}

        {planogramProducts === null && !productsFetcher.isError && (
          <LoadingSpinner isBlockElement={true} />
        )}

        {planogramProducts !== null && (
          <Table striped size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Location</th>
                <th>Name</th>
                <th>UPC</th>
              </tr>
            </thead>
            <tbody>
              {planogramProducts.rows.map((row) => (
                <tr key={`${row.location_name}-${String(row.product.pk)}`}>
                  <td>{row.location_name}</td>
                  <td>
                    {row.product.name === "" ? (
                      <span className="text-muted">(no name)</span>
                    ) : (
                      row.product.name
                    )}
                  </td>
                  <td>{row.product.upc}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
    </Modal>
  );
}
