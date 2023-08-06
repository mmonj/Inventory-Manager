import React, { useContext } from "react";

import { Context } from "@reactivated";

import { useFetch } from "@client/hooks/useFetch";
import { uncarry_product_addition } from "@client/util/stockTracker";
import { BasicProductAddition } from "@client/util/stockTracker/apiInterfaces";

import { LoadingSpinner } from "../LoadingSpinner";

interface Props {
  productAddition: BasicProductAddition;
  onProductDeleteHandler: (upcNumber: string) => void;
}

export function NewScanListItem({ productAddition, onProductDeleteHandler }: Props) {
  const { isLoading, fetchData } = useFetch<BasicProductAddition>();
  const djangoContext = useContext(Context);

  async function onDeleteClick(productAddition: BasicProductAddition) {
    const fetchCallback = () => {
      return uncarry_product_addition(productAddition.id!, djangoContext.csrf_token);
    };

    const [isSuccess] = await fetchData(fetchCallback);
    if (isSuccess) {
      onProductDeleteHandler(productAddition.product.upc!);
    }
  }

  return (
    <li className="list-group-item d-flex justify-content-between align-items-start collapse show">
      <div className="ms-2 me-auto product-container">
        <div className="fw-bold upc-container">{productAddition.product.upc}</div>
        <div className="product-name">{productAddition.product.name}</div>
      </div>

      {isLoading && <LoadingSpinner isBlockElement={false} />}
      {!isLoading && (
        <button
          onClick={() => onDeleteClick(productAddition)}
          className="button-remove-product btn btn-primary badge rounded-pill my-auto ms-2 py-2"
        >
          Delete
        </button>
      )}
    </li>
  );
}
