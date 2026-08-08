import React from "react";

import { CSRFToken, reverse, templates, useForm } from "@reactivated";
import { Alert } from "react-bootstrap";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";

export function Template(props: templates.StockTrackerAddNewStores) {
  const form = useForm({ form: props.form });
  const storesText = form.fields.stores_text;

  return (
    <Layout title="Add New Stores" navbar={<NavigationBar />}>
      <section className="m-3 mw-rem-60 mx-auto">
        <form action={reverse("stock_tracker:add_new_stores")} method="POST">
          <CSRFToken />

          <div>
            <label htmlFor={storesText.widget.attrs.id} className="form-label">
              Enter new stores (separate stores with a new line)
            </label>
            <textarea
              id={storesText.widget.attrs.id}
              name={storesText.widget.name}
              defaultValue={storesText.widget.value ?? ""}
              className="form-control"
              style={{ height: "70vh" }}
            />
            {storesText.error !== null && (
              <Alert variant="danger" className="p-1 my-1">
                {storesText.error}
              </Alert>
            )}
            <div className="d-grid gap-2 col-6 mx-auto mt-2">
              <button className="btn btn-primary" type="submit">
                Submit
              </button>
            </div>
          </div>
        </form>
      </section>
    </Layout>
  );
}
