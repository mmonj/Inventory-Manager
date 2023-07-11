import React, { useContext, useState } from "react";

import { CSRFToken, Context, reverse, templates, useForm } from "@reactivated";
import { Alert } from "react-bootstrap";

import { FieldHandler } from "reactivated/dist/forms";
import { DjangoFormsWidgetsSelect, DjangoFormsWidgetsTextarea } from "reactivated/dist/generated";

import { Layout } from "@client/components/Layout";
import { Navbar } from "@client/components/productLocator/Navbar";
import { Select, Textarea } from "@client/components/widgets";

export default (props: templates.ProductLocatorAddNewProducts) => {
  const [selectValue, setSelectValue] = useState(props.form.fields.planogram_pk.widget.value);
  const [textValue, setTextValue] = useState(props.form.fields.planogram_text_dump.widget.value);
  const form = useForm({ form: props.form });
  const djangoContext = useContext(Context);

  const planoSelect = form.fields.planogram_pk as FieldHandler<DjangoFormsWidgetsSelect>;
  const planoDump = form.fields.planogram_text_dump as FieldHandler<DjangoFormsWidgetsTextarea>;

  function handleSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectValue(() => event.target.value);
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    setTextValue(() => event.target.value ?? "");
  }

  return (
    <Layout title="Add New Products" navbarComponent={<Navbar />}>
      <section className="mw-rem-60 mx-auto p-2">
        <h1 id="page-title" className="m-3 text-center title-color ">
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
          method="POST">
          <CSRFToken />
          <fieldset>
            <legend className="mb-3">Planogram Data</legend>
            <div id="planogram-select-container" className="mb-3">
              <label htmlFor={planoSelect.widget.attrs.id} className="form-label">
                Planogram
              </label>
              <Select
                {...planoSelect.widget}
                value={selectValue}
                onChange={handleSelectChange}
                className="form-select"
              />
              {planoSelect.error !== null && (
                <Alert variant="danger" className="p-1 my-1">
                  {planoSelect.error}
                </Alert>
              )}
            </div>
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
            <button type="submit" className="btn btn-primary col-12 my-2">
              Submit
            </button>
          </fieldset>
        </form>
      </section>
    </Layout>
  );
};
