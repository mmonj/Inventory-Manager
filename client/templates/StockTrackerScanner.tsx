import React, { useContext, useState } from "react";

import { Context, templates } from "@reactivated";
import { Alert } from "react-bootstrap";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { NewScanListItem } from "@client/components/stockTracker/NewScanListItem";
import { useFetch } from "@client/hooks/useFetch";
import { TScanErrorCallback, TScanSuccessCallback } from "@client/types";
import { getErrorList } from "@client/util/commonUtil";
import { postLogProductScan } from "@client/util/stockTracker";
import { BasicProductAddition } from "@client/util/stockTracker/apiInterfaces";

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
  const [productAdditions, setProductAdditions] = useState<BasicProductAddition[]>([]);
  const [store, setStore] = useState<IStore | null>(null);
  const { isError, isLoading, fetchData } = useFetch<BasicProductAddition>();
  const djangoContext = useContext(Context);
  const [errorList, setErrorList] = useState<string[]>([]);

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

    const fetchCallback = () => postLogProductScan(decodedText, storePk, djangoContext.csrf_token);

    const [isSuccess, result] = await fetchData(fetchCallback);
    if (isSuccess) {
      if (productAdditions.some((productAddition) => productAddition.product.upc === decodedText)) {
        setProductAdditions((prev) =>
          prev.filter((productAddition) => productAddition.product.upc !== decodedText)
        );
      }

      setProductAdditions((prev) => {
        return [result, ...prev];
      });
    } else {
      const errorList = getErrorList(await result.json());
      setErrorList(() => errorList);
    }
  };

  function onProductDelete(upcNumber: string) {
    setProductAdditions((prev) => {
      return prev.filter((productAddition) => productAddition.product.upc !== upcNumber);
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

            {isLoading && (
              <div className="d-flex justify-content-center">
                <LoadingSpinner isBlockElement={true} />
              </div>
            )}
            {isError && (
              <Alert variant="danger" className="text-center mx-2">
                {errorList.map((error) => (
                  <div key={crypto.randomUUID()}>{error}</div>
                ))}
              </Alert>
            )}
            <ol id="scanner-results" className="list-group list-group-numbered px-2">
              {productAdditions.map((productAddition) => (
                <NewScanListItem
                  key={productAddition.id}
                  productAddition={productAddition}
                  onProductDeleteHandler={onProductDelete}
                />
              ))}
            </ol>
          </section>
        )}
      </section>
    </Layout>
  );
}
