import React, { useState } from "react";

import { Context, templates } from "@reactivated";
import { AnimatePresence, LazyMotion, domAnimation } from "motion/react";
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

export function Template(props: templates.StockTrackerScanHistory) {
  const djangoContext = React.useContext(Context);
  const [chosenStore, setChosenStore] = useState<IStore | null>(null);
  const [productAdditions, setProductAdditions] = useState<BasicProductAddition[]>([]);
  const productAdditionPaginationState = useFetch<BasicProductAddition[]>();
  const [nextPageNumber, setNextPageNumber] = useState(1);

  const paginationErrorMessage = React.useRef<HTMLDivElement>(null);

  const storesByPk = React.useMemo(() => {
    const map = new Map<number, IStore>();
    for (const field_rep of props.field_reps) {
      for (const store of field_rep.stores) {
        map.set(store.pk, store);
      }
    }
    return map;
  }, [props.field_reps]);

  async function handleGetProductAdditions(storePk: number, page: number) {
    const productAdditionsCallback = () =>
      getProductAdditions(djangoContext.csrf_token, {
        page,
        store_id: storePk,
      });

    const [isSuccess, result] =
      await productAdditionPaginationState.fetchData(productAdditionsCallback);
    if (isSuccess) {
      setProductAdditions((prev) => [...prev, ...result]);
      setNextPageNumber(page + 1);
    } else {
      paginationErrorMessage.current?.scrollIntoView();
    }
  }

  async function handleStoreSubmission(storePk: string) {
    const store = storesByPk.get(parseInt(storePk));
    if (store === undefined) {
      return;
    }

    setChosenStore(store);
    setProductAdditions([]);
    await handleGetProductAdditions(store.pk, 1);
  }

  function handleProductAdditionDeletion(productAdditionPk: number) {
    setProductAdditions((prev) =>
      prev.filter((productAddition) => productAddition.id !== productAdditionPk)
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <Layout title="Scan History" className="p-3" navbar={<NavigationBar />}>
        <section className="m-2 px-2 mw-rem-60 mx-auto">
          <h1 className="text-center">Scan History</h1>
          {chosenStore === null && (
            <FieldRepStoreSelector
              propType="fieldReps"
              field_reps={props.field_reps}
              handleStoreSubmission={handleStoreSubmission}
            />
          )}

          {chosenStore !== null && (
            <>
              <ol className="list-group">
                <h1 className="text-center my-3">{chosenStore.name}</h1>
                <AnimatePresence initial={false}>
                  {productAdditions.map((productAddition) => (
                    <ProductAdditionListItem
                      key={productAddition.id}
                      productAddition={productAddition}
                      productAdditionDeletionHandler={handleProductAdditionDeletion}
                    />
                  ))}
                </AnimatePresence>
              </ol>

              <div
                onClick={() => handleGetProductAdditions(chosenStore.pk, nextPageNumber)}
                role="button"
                className="my-3 text-center text-bold"
              >
                {!productAdditionPaginationState.isLoading && (
                  <Alert className="p-2" style={{ fontWeight: "500" }}>
                    Load more product additions
                  </Alert>
                )}
                {productAdditionPaginationState.isLoading && (
                  <Alert className="p-2" style={{ fontWeight: "500" }}>
                    Loading further product additions{" "}
                    <LoadingSpinner isBlockElement={false} size={"sm"} className="text-center" />
                  </Alert>
                )}
                {productAdditionPaginationState.isError && (
                  <Alert ref={paginationErrorMessage} className="p-2" variant="danger">
                    {productAdditionPaginationState.errorMessages.map((msg, index) => (
                      <div key={index}>{msg}</div>
                    ))}
                  </Alert>
                )}
              </div>
            </>
          )}
        </section>
      </Layout>
    </LazyMotion>
  );
}
