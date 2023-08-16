import React, { useState } from "react";

import { Context, templates } from "@reactivated";
import { Alert } from "react-bootstrap";

import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { ProductAdditionListItem } from "@client/components/stockTracker/ProductAdditionListItem";
import { useFetch } from "@client/hooks/useFetch";
import { getProductAdditions } from "@client/util/stockTracker";
import { BasicProductAddition } from "@client/util/stockTracker/ajaxInterfaces";

import { IStore } from "./StockTrackerScanner";

export default function (props: templates.StockTrackerScanHistory) {
  const djangoContext = React.useContext(Context);
  const [chosenStore, setChosenStore] = useState<IStore | null>(null);
  const [productAdditions, setProductAdditions] = useState<BasicProductAddition[]>([]);
  const productAdditionPaginationState = useFetch<BasicProductAddition[]>();
  const [nextPageNumber, setNextPageNumber] = useState(1);

  const paginationErrorMessage = React.useRef<HTMLDivElement>(null);

  async function handleGetProductAdditions(storePk: number) {
    const productAdditionsCallback = () =>
      getProductAdditions(djangoContext.csrf_token, {
        page: nextPageNumber,
        sort_by: "",
        store_id: storePk,
      });

    const [isSuccess, result] = await productAdditionPaginationState.fetchData(
      productAdditionsCallback
    );
    if (isSuccess) {
      setProductAdditions((prev) => [...prev, ...result]);
      setNextPageNumber((prev) => prev + 1);
    } else {
      paginationErrorMessage.current?.scrollIntoView();
    }
  }

  async function handleStoreSubmission(storePk: string) {
    for (const field_rep of props.field_reps) {
      for (const store of field_rep.stores) {
        if (store.pk === parseInt(storePk)) {
          setChosenStore(() => store);
          await handleGetProductAdditions(store.pk);
          return;
        }
      }
    }
  }

  function handleProductAdditionDeletion(productAdditionPk: number) {
    setProductAdditions((prev) =>
      prev.filter((productAddition) => productAddition.id !== productAdditionPk)
    );
  }

  return (
    <Layout title="Scan History" navbar={<NavigationBar />}>
      <section className="m-2 px-2 mw-rem-60 mx-auto">
        {chosenStore === null && (
          <FieldRepStoreSelector
            propType="fieldReps"
            field_reps={props.field_reps}
            handleStoreSubmission={handleStoreSubmission}
          />
        )}

        {chosenStore !== null && (
          <ol className="list-group">
            <h1 className="title-color text-center my-3">{chosenStore.name}</h1>
            {productAdditions.map((productAddition) => (
              <ProductAdditionListItem
                key={productAddition.id}
                productAddition={productAddition}
                productAdditionDeletionHandler={handleProductAdditionDeletion}
              />
            ))}
          </ol>
        )}

        <div
          onClick={() => handleGetProductAdditions(chosenStore!.pk)}
          role="button"
          className="my-3 text-center text-bold"
        >
          {chosenStore !== null && !productAdditionPaginationState.isLoading && (
            <Alert className="p-2" style={{ fontWeight: "500" }}>
              Load more product additions
            </Alert>
          )}
          {productAdditionPaginationState.isLoading && (
            <>
              <Alert className="p-2" style={{ fontWeight: "500" }}>
                Loading further product additions{" "}
                <LoadingSpinner isBlockElement={false} size={"sm"} className="text-center" />
              </Alert>
            </>
          )}
          {productAdditionPaginationState.isError && (
            <Alert ref={paginationErrorMessage} className="p-2" variant="danger">
              {productAdditionPaginationState.errorMessages.map((msg) => (
                <div key={crypto.randomUUID()}>{msg}</div>
              ))}
            </Alert>
          )}
        </div>
      </section>
    </Layout>
  );
}
