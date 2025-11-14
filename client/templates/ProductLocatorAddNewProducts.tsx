import React, { useContext, useState } from "react";

import { CSRFToken, Context, interfaces, reverse, templates, useForm } from "@reactivated";
import { Alert } from "react-bootstrap";
import Select from "react-select";

import { FieldHandler } from "reactivated/dist/forms";
import { DjangoFormsWidgetsTextarea } from "reactivated/dist/generated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/productLocator/NavigationBar";
import { Textarea } from "@client/components/widgets";
import { useFetch } from "@client/hooks/useFetch";
import { fetchByReactivated } from "@client/util/commonUtil";

type SelectOption = { value: number; label: string };

export default function Template(props: templates.ProductLocatorAddNewProducts) {
  const [selectedStore, setSelectedStore] = useState<SelectOption | null>(null);
  const [selectedPlanogram, setSelectedPlanogram] = useState<SelectOption | null>(null);
  const [textValue, setTextValue] = useState(props.form.fields.planogram_text_dump.widget.value);
  const form = useForm({ form: props.form });
  const djangoContext = useContext(Context);
  const planogramsFetcher = useFetch<interfaces.IPlanogramsByStore>();

  const planoDump = form.fields.planogram_text_dump as FieldHandler<DjangoFormsWidgetsTextarea>;

  const storeOptions: SelectOption[] = props.stores.map((store) => ({
    value: store.pk,
    label: store.name,
  }));

  const planogramOptions: SelectOption[] =
    planogramsFetcher.data?.planograms.map((planogram) => {
      const isOutdated = planogram.date_end !== null;
      const isSeasonal = planogram.plano_type_info.value === "seasonal";
      const suffix = `${isSeasonal ? " 🌟" : ""}${isOutdated ? " [OUTDATED]" : ""}`;
      return {
        value: planogram.pk,
        label: `${planogram.name}${suffix}`,
      };
    }) ?? [];

  async function handleStoreChange(option: SelectOption | null) {
    setSelectedStore(option);
    setSelectedPlanogram(null);

    if (option) {
      await planogramsFetcher.fetchData(() =>
        fetchByReactivated<interfaces.IPlanogramsByStore>(
          reverse("product_locator:get_planograms_by_store", { store_id: option.value }),
          djangoContext.csrf_token,
          "GET"
        )
      );
    }
  }

  function handlePlanogramChange(option: SelectOption | null) {
    setSelectedPlanogram(option);
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setTextValue(() => event.target.value ?? "");
  }

  return (
    <Layout title="Add New Products" navbar={<NavigationBar />}>
      <section className="mw-rem-60 mx-auto p-2">
        <h1 id="page-title" className="m-3 text-center ">
          Add New Products
        </h1>
        {djangoContext.messages.length === 0 && form.nonFieldErrors === null && (
          <div className="alert alert-info opacity-75">
            <p className="m-0">Instructions:</p>
            <p className="m-0 ps-2">Download Planogram PDF</p>
            <p className="m-0 ps-2">
              Convert to image (due to no text-encoding metadata being present in PDF)
            </p>
            <p className="m-0 ps-2">Combine relevant images to a single image</p>
            <p className="m-0 ps-2">Run through OCR processor</p>
            <p className="m-0 ps-2">
              Paste output here for OCR correction and parsing. DB entries will be created from
              input.
            </p>
          </div>
        )}
        <form
          id="store-plano-selector-form"
          action={reverse("product_locator:add_new_products")}
          method="POST"
        >
          <CSRFToken />
          <fieldset>
            <legend className="mb-3">Store and Planogram Selection</legend>

            {/* step 1: store selection */}
            <div className="mb-3">
              <label className="form-label">Store</label>
              <Select
                options={storeOptions}
                value={selectedStore}
                onChange={handleStoreChange}
                isLoading={planogramsFetcher.isLoading}
                placeholder="Select a store..."
                isClearable
                classNamePrefix="react-select"
              />
            </div>
            {/* error state */}
            {planogramsFetcher.errorMessages.length > 0 && (
              <Alert variant="danger" className="mb-3">
                <strong>Error loading planograms:</strong>
                <ul className="mb-0 mt-2">
                  {planogramsFetcher.errorMessages.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* step 2: planogram selection */}
            {selectedStore && !planogramsFetcher.isLoading && planogramOptions.length > 0 && (
              <div className="mb-3">
                <label className="form-label">Planogram</label>
                <Select
                  options={planogramOptions}
                  value={selectedPlanogram}
                  onChange={handlePlanogramChange}
                  placeholder="Select a planogram..."
                  isClearable
                  classNamePrefix="react-select"
                />
                {/* Hidden input for form submission */}
                <input type="hidden" name="planogram_pk" value={selectedPlanogram?.value ?? ""} />
              </div>
            )}

            {/* no planograms found */}
            {selectedStore &&
              !planogramsFetcher.isLoading &&
              planogramsFetcher.data &&
              planogramOptions.length === 0 && (
                <Alert variant="warning" className="mb-3">
                  No planograms found for this store.
                </Alert>
              )}

            {/* step 3: planogram data input - only shown after planogram selection */}
            {selectedPlanogram && (
              <>
                <legend className="mb-3 mt-4">Planogram Data</legend>
                <div className="mb-3">
                  <label htmlFor={planoDump.widget.attrs.id} className="form-label">
                    Planogram data dump
                  </label>
                  <Textarea
                    {...planoDump.widget}
                    maxLength={100_000}
                    value={textValue}
                    onChange={handleTextChange}
                    className="form-control"
                  />
                  {planoDump.error !== null && (
                    <Alert variant="danger" className="p-1 my-1">
                      {planoDump.error}
                    </Alert>
                  )}
                </div>
                <div>
                  <div className="form-check mb-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="is-reset-planogram"
                      name="is_reset_planogram"
                      defaultChecked={props.form.fields.is_reset_planogram.widget.value}
                    />
                    <label className="form-check-label" htmlFor="is-reset-planogram">
                      Reset Planogram
                    </label>
                  </div>
                  <p>
                    <strong>Note:</strong> This action is intended for planogram resets and will
                    remove all existing products from the selected planogram.
                  </p>
                </div>
                <button type="submit" className="btn btn-primary col-12 my-2">
                  Submit
                </button>
              </>
            )}
          </fieldset>
        </form>
      </section>
    </Layout>
  );
}
