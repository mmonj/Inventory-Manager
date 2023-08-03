import React, { useContext } from "react";

import { Context, reverse } from "@reactivated";

import { useFetch } from "@client/hooks/useFetch";
import { IStore } from "@client/templates/StockTrackerScanner";
import { IProductAdditionResponse } from "@client/types";
import { postProductAddition } from "@client/util/stockTracker/common";

import { LoadingSpinner } from "../LoadingSpinner";

export interface IScannedProduct {
  key: string;
  upcNumber: string;
  productName: string;
}

interface Props extends IScannedProduct {
  onProductDeleteHandler: (upcNumber: string) => void;
  store: IStore;
}

export function NewScanListItem({ upcNumber, productName, onProductDeleteHandler, store }: Props) {
  const { isLoading, fetchData } = useFetch<IProductAdditionResponse>();
  const djangoContext = useContext(Context);

  async function onDeleteClick(upcNumber: string) {
    const fetchCallback = () =>
      postProductAddition(
        upcNumber,
        store.pk,
        store.name!,
        reverse("stock_tracker:log_product_scan"),
        djangoContext.csrf_token,
        { isRemove: true }
      );

    const [isSuccess] = await fetchData(fetchCallback);
    if (isSuccess) {
      onProductDeleteHandler(upcNumber);
    }
  }

  return (
    <li
      className="list-group-item d-flex justify-content-between align-items-start collapse show"
      data-upc_number={upcNumber}>
      <div className="ms-2 me-auto product-container">
        <div className="fw-bold upc-container">{upcNumber}</div>
        <div className="product-name">{productName}</div>
      </div>

      {isLoading && <LoadingSpinner isBlockElement={false} />}
      {!isLoading && (
        <button
          onClick={() => onDeleteClick(upcNumber)}
          className="button-remove-product btn btn-primary badge rounded-pill my-auto ms-2 py-2">
          Delete
        </button>
      )}
    </li>
  );
}
