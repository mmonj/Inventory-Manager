import React from "react";

import { Context } from "@reactivated";

import { format } from "date-fns";

import { useFetch } from "@client/hooks/useFetch";
import { uncarry_product_addition } from "@client/util/stockTracker";
import { BasicProductAddition } from "@client/util/stockTracker/apiInterfaces";

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

  async function handleDeleteClick() {
    const fetchCallback = () => {
      return uncarry_product_addition(productAddition.id!, djangoContext.csrf_token);
    };
    const [isSuccess] = await productAdditionDeleteState.fetchData(fetchCallback);
    if (isSuccess) {
      productAdditionDeletionHandler(productAddition.id!);
    }
  }

  return (
    <li key={productAddition.id} className="list-group-item product-list-item collapse show">
      <div className="d-flex w-100 justify-content-between">
        <h5 className="mb-1">{productAddition.product.upc}</h5>

        <small className="text-muted">
          {format(new Date(productAddition.date_last_scanned!), "MMMM d, yyyy, hh:mm a")}{" "}
        </small>
      </div>
      <div className="d-flex flex-row justify-content-between">
        <div className="truncated-text-container">
          <p className="truncated-text mb-1">{productAddition.product.name}</p>
          <small className="text-muted">
            {productAddition.product.parent_company?.expanded_name ??
              productAddition.product.parent_company?.short_name ??
              "Unknown brand"}
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
    </li>
  );
}
