import React from "react";

import { Context } from "@reactivated";
import { m } from "motion/react";

import { format } from "date-fns";

import { useFetch } from "@client/hooks/useFetch";
import { getBrandCompanyLabel, uncarry_product_addition } from "@client/util/stockTracker";
import { BasicProductAddition } from "@client/util/stockTracker/ajaxInterfaces";

import { LoadingSpinner } from "../LoadingSpinner";

interface Props {
  productAddition: BasicProductAddition;
  productAdditionDeletionHandler: (productAdditionPk: number) => void;
}

export function ProductAdditionListItem({
  productAddition,
  productAdditionDeletionHandler,
}: Props) {
  const productAdditionDeleteState = useFetch<BasicProductAddition>();
  const djangoContext = React.useContext(Context);

  const dateLastScanned =
    productAddition.date_last_scanned === null || productAddition.date_last_scanned === undefined
      ? ""
      : format(new Date(productAddition.date_last_scanned), "MMMM d, yyyy, hh:mm a");

  async function handleDeleteClick() {
    if (productAddition.id === undefined) {
      return;
    }
    const productAdditionId = productAddition.id;

    const fetchCallback = () =>
      uncarry_product_addition(productAdditionId, djangoContext.csrf_token);
    const [isSuccess] = await productAdditionDeleteState.fetchData(fetchCallback);
    if (isSuccess) {
      productAdditionDeletionHandler(productAdditionId);
    }
  }

  return (
    <m.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="list-group-item product-list-item overflow-hidden"
    >
      <div className="d-flex w-100 justify-content-between">
        <h5 className="mb-1">{productAddition.product.upc}</h5>

        <small className="text-muted">{dateLastScanned} </small>
      </div>
      <div className="d-flex flex-row justify-content-between">
        <div className="truncated-text-container">
          <p className="truncated-text mb-1">{productAddition.product.name}</p>
          <small className="text-muted">
            {getBrandCompanyLabel(productAddition.product.parent_company)}
          </small>
        </div>

        {!productAdditionDeleteState.isLoading && (
          <button
            onClick={handleDeleteClick}
            type="button"
            className="button-remove-product btn btn-primary badge rounded-pill my-auto ms-2 py-2"
          >
            Delete
          </button>
        )}
        {productAdditionDeleteState.isLoading && <LoadingSpinner isBlockElement={false} />}
      </div>
    </m.li>
  );
}
