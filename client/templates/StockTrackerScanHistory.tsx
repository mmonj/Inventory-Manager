import React, { useState } from "react";

import { Context, templates } from "@reactivated";
import { AnimatePresence, LazyMotion, domAnimation } from "motion/react";
import { Alert, Button } from "react-bootstrap";

import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { LoadingSpinner } from "@client/components/LoadingSpinner";
import { FieldRepStoreSelector } from "@client/components/StoreSelector";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { ProductAdditionListItem } from "@client/components/stockTracker/ProductAdditionListItem";
import { ScanHistoryFiltersModal } from "@client/components/stockTracker/ScanHistoryFiltersModal";
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
  // The filters actually applied to the current results, as opposed to the modal's draft
  // (possibly unsubmitted) values - kept separate so opening/toggling/typing in the modal has
  // no effect until the modal's single Search button is clicked, and "load more" keeps using
  // whatever filters are actually active. Both filters are applied server-side.
  const [productNameFilter, setProductNameFilter] = useState("");
  const [selectedBrandCompanyIds, setSelectedBrandCompanyIds] = useState<Set<number>>(new Set());

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  // Draft state for the modal - only committed to productNameFilter/selectedBrandCompanyIds
  // when the modal's Search button is submitted.
  const [productNameSearchInput, setProductNameSearchInput] = useState("");
  const [draftSelectedBrandCompanyIds, setDraftSelectedBrandCompanyIds] = useState<Set<number>>(
    new Set()
  );

  const paginationErrorMessage = React.useRef<HTMLDivElement>(null);

  // All possible clients, not just ones present among currently-loaded product additions -
  // provided in full on page load so the checklist doesn't shrink/grow as more pages load.
  React.useEffect(() => {
    const allIds = new Set(props.brand_parent_companies.map((company) => company.pk));
    setSelectedBrandCompanyIds(allIds);
    setDraftSelectedBrandCompanyIds(allIds);
  }, [props.brand_parent_companies]);

  const isBrandCompanyFilterActive =
    selectedBrandCompanyIds.size < props.brand_parent_companies.length;

  const storesByPk = React.useMemo(() => {
    const map = new Map<number, IStore>();
    for (const field_rep of props.field_reps) {
      for (const store of field_rep.stores) {
        map.set(store.pk, store);
      }
    }
    return map;
  }, [props.field_reps]);

  async function handleGetProductAdditions(
    storePk: number,
    page: number,
    productName: string,
    brandCompanyIds: Set<number>
  ) {
    const isAllBrandCompaniesSelected =
      brandCompanyIds.size === props.brand_parent_companies.length;

    const productAdditionsCallback = () =>
      getProductAdditions(djangoContext.csrf_token, {
        page,
        store_id: storePk,
        product_name: productName,
        brand_parent_company_ids: isAllBrandCompaniesSelected
          ? ""
          : Array.from(brandCompanyIds).join(","),
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

    const allIds = new Set(props.brand_parent_companies.map((company) => company.pk));

    setChosenStore(store);
    setProductAdditions([]);
    setProductNameFilter("");
    setProductNameSearchInput("");
    setSelectedBrandCompanyIds(allIds);
    setDraftSelectedBrandCompanyIds(allIds);
    await handleGetProductAdditions(store.pk, 1, "", allIds);
  }

  async function handleFiltersSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosenStore === null) {
      return;
    }

    setProductNameFilter(productNameSearchInput);
    setSelectedBrandCompanyIds(draftSelectedBrandCompanyIds);
    setProductAdditions([]);
    setShowFiltersModal(false);
    await handleGetProductAdditions(
      chosenStore.pk,
      1,
      productNameSearchInput,
      draftSelectedBrandCompanyIds
    );
  }

  async function handleClearProductNameFilter() {
    if (chosenStore === null) {
      return;
    }

    setProductNameFilter("");
    setProductNameSearchInput("");
    setProductAdditions([]);
    await handleGetProductAdditions(chosenStore.pk, 1, "", selectedBrandCompanyIds);
  }

  async function handleClearBrandCompanyFilter() {
    if (chosenStore === null) {
      return;
    }

    const allIds = new Set(props.brand_parent_companies.map((company) => company.pk));
    setSelectedBrandCompanyIds(allIds);
    setDraftSelectedBrandCompanyIds(allIds);
    setProductAdditions([]);
    await handleGetProductAdditions(chosenStore.pk, 1, productNameFilter, allIds);
  }

  function handleShowFiltersModal() {
    // reset the draft to whatever's actually applied, discarding any unsubmitted edits from
    // a previous time the modal was opened and dismissed without submitting
    setProductNameSearchInput(productNameFilter);
    setDraftSelectedBrandCompanyIds(selectedBrandCompanyIds);
    setShowFiltersModal(true);
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
              <h1 className="text-center my-3">{chosenStore.name}</h1>

              <div className="mb-3">
                <Button
                  variant={
                    isBrandCompanyFilterActive || productNameFilter !== ""
                      ? "warning"
                      : "outline-secondary"
                  }
                  onClick={handleShowFiltersModal}
                >
                  <FontAwesomeIcon icon={faFilter} className="me-1" />
                  Filters
                </Button>
              </div>

              {productNameFilter !== "" && (
                <Alert variant="info" className="mb-2">
                  Showing results for product name containing &quot;{productNameFilter}&quot;{" "}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 align-baseline"
                    onClick={() => void handleClearProductNameFilter()}
                  >
                    Clear Product Filter
                  </Button>
                </Alert>
              )}

              {isBrandCompanyFilterActive && (
                <Alert variant="info" className="mb-2">
                  Client filter active — showing {selectedBrandCompanyIds.size} of{" "}
                  {props.brand_parent_companies.length} clients.{" "}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 align-baseline"
                    onClick={() => void handleClearBrandCompanyFilter()}
                  >
                    Clear Client Filter
                  </Button>
                </Alert>
              )}

              <ol className="list-group">
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

              <ScanHistoryFiltersModal
                show={showFiltersModal}
                onHide={() => setShowFiltersModal(false)}
                brandCompanies={props.brand_parent_companies}
                selectedBrandCompanyIds={draftSelectedBrandCompanyIds}
                onChangeBrandCompanyIds={setDraftSelectedBrandCompanyIds}
                productNameSearchInput={productNameSearchInput}
                onChangeProductNameSearchInput={setProductNameSearchInput}
                onSubmit={(event) => void handleFiltersSubmit(event)}
              />

              <div
                onClick={() =>
                  handleGetProductAdditions(
                    chosenStore.pk,
                    nextPageNumber,
                    productNameFilter,
                    selectedBrandCompanyIds
                  )
                }
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
