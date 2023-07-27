import React, { useContext, useState } from "react";

import { Context, reverse, templates } from "@reactivated";
import { Alert } from "react-bootstrap";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { IScannedProduct, NewScanListItem } from "@client/components/stockTracker/NewScanListItem";
import { useFetch } from "@client/hooks/useFetch";
import { IProductAdditionResponse, TScanErrorCallback, TScanSuccessCallback } from "@client/types";
import { postProductAddition } from "@client/util/stockTrackerUtil";

export interface IStore {
  pk: number;
  name: string | null;
}

export interface IFieldRep {
  pk: number;
  name: string;
  stores: IStore[];
}

export default function (props: templates.StockTrackerScanner) {
  const [scannedProducts, setScannedProducts] = useState<IScannedProduct[]>([]);
  const [store, setStore] = useState<IStore | null>(null);
  const { isError, isLoading, fetchData } = useFetch<IProductAdditionResponse>();
  const djangoContext = useContext(Context);

  function findMatchingStore(storePk: number): IStore | null {
    for (const field_rep of props.field_reps) {
      for (const store of field_rep.stores) {
        if (store.pk === storePk) {
          return store;
        }
      }
    }

    return null;
  }

  function handleStoreSubmission(storePk: string) {
    const matchingStore = findMatchingStore(parseInt(storePk));
    if (matchingStore === null) throw new Error("Matching store is null");

    setStore(() => structuredClone(matchingStore));
  }

  const onScanSuccess: TScanSuccessCallback = async (decodedText: string) => {
    const storeName = store?.name;
    if (storeName === undefined || storeName === null) throw new Error("Store name is nullish");
    const storePk = store?.pk;
    if (storePk === undefined) throw new Error("Store pk is undefined");

    const fetchCallback = () =>
      postProductAddition(
        decodedText,
        storePk,
        storeName,
        reverse("stock_tracker:log_product_scan"),
        djangoContext.csrf_token
      );

    const [isSuccess, result] = await fetchData(fetchCallback);
    if (isSuccess) {
      if (scannedProducts.some((product) => product.upcNumber === decodedText)) {
        setScannedProducts((prev) => prev.filter((product) => product.upcNumber !== decodedText));
      }

      setScannedProducts((prev) => {
        return [
          {
            key: crypto.randomUUID(),
            productName: result.product_info.name,
            upcNumber: decodedText,
          },
          ...prev,
        ];
      });
    }
  };

  function onProductDelete(upcNumber: string) {
    setScannedProducts((prev) => {
      return prev.filter((product) => product.upcNumber !== upcNumber);
    });
  }

  const onScanError: TScanErrorCallback = (errorMessage: string) => {
    console.log("An error occurred on scan:", errorMessage);
  };

  return (
    <Layout title="Scanner" navbar={<NavigationBar />}>
      <section className="mw-rem-50 mx-auto">
        {store === null && (
          <FieldRepStoreSelector
            propType="fieldReps"
            field_reps={props.field_reps}
            handleStoreSubmission={handleStoreSubmission}
          />
        )}

        {store !== null && (
          <section id="scanner-container" className="mw-rem-60 mx-auto">
            <div id="scanner-store-indicator" className="p-2">
              <h5 className="card-title text-center title-color">{store.name}</h5>
            </div>

            <BarcodeScanner scanSuccessCallback={onScanSuccess} scanErrorCallback={onScanError} />

            <ol id="scanner-results" className="list-group list-group-numbered px-2">
              {scannedProducts.map((scannedProduct) => (
                <NewScanListItem
                  key={scannedProduct.key}
                  productName={scannedProduct.productName}
                  upcNumber={scannedProduct.upcNumber}
                  onProductDeleteHandler={onProductDelete}
                  store={store}
                />
              ))}
              {isLoading && (
                <div className="d-flex justify-content-center">
                  <LoadingSpinner />
                </div>
              )}
              {isError && (
                <Alert variant="danger" className="text-center">
                  An Error Occurred!
                </Alert>
              )}
            </ol>
          </section>
        )}
      </section>
    </Layout>
  );
}
