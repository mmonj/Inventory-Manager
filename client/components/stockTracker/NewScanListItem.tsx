import React, { useContext } from "react";

import { Context } from "@reactivated";
import { m } from "motion/react";

import { useFetch } from "@client/hooks/useFetch";
import { uncarry_product_addition } from "@client/util/stockTracker";
import { BasicProductAddition } from "@client/util/stockTracker/ajaxInterfaces";

import { LoadingSpinner } from "../LoadingSpinner";

interface Props {
  productAddition: BasicProductAddition;
  onProductDeleteHandler: (upcNumber: string) => void;
}

export function NewScanListItem({ productAddition, onProductDeleteHandler }: Props) {
  const { isLoading, fetchData } = useFetch<BasicProductAddition>();
  const djangoContext = useContext(Context);

  async function onDeleteClick(productAddition: BasicProductAddition) {
    if (productAddition.id === undefined || productAddition.product.upc === undefined) {
      return;
    }
    const productAdditionId = productAddition.id;
    const upc = productAddition.product.upc;

    const fetchCallback = () =>
      uncarry_product_addition(productAdditionId, djangoContext.csrf_token);

    const [isSuccess] = await fetchData(fetchCallback);
    if (isSuccess) {
      onProductDeleteHandler(upc);
    }
  }

  return (
    <m.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="list-group-item d-flex justify-content-between align-items-start overflow-hidden"
    >
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
    </m.li>
  );
}
