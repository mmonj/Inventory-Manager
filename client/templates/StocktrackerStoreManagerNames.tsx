import React, { useEffect, useState } from "react";

import { CSRFToken, FieldRepresentative_3Ba5E2A106, reverse, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { StoreManagerFieldset } from "@client/components/stockTracker/StoreManagerFieldset";

export function Template(props: templates.StocktrackerStoreManagerNames) {
  const [currentRepStores, setCurrentRepStores] = useState<
    FieldRepresentative_3Ba5E2A106["stores"]
  >([]);
  const [fieldRepPk, setFieldRepPk] = useState<number | undefined>(props.field_reps[0].pk);

  useEffect(() => {
    if (fieldRepPk === undefined) {
      throw new Error("fieldRepPk is undefined");
    }

    for (const field_rep of props.field_reps) {
      if (field_rep.pk === fieldRepPk) {
        setCurrentRepStores(() => structuredClone(field_rep.stores));
      }
    }
  }, [fieldRepPk]);

  return (
    <Layout title="Store Manager Names" navbar={<NavigationBar />}>
      <section className="mw-rem-50 mx-auto p-3">
        <form
          id="manager-names-form"
          action={reverse("stock_tracker:get_manager_names")}
          method="POST"
        >
          <CSRFToken />

          <fieldset>
            <legend className="text-center">
              <h2 className="title-color">Manager Names</h2>
            </legend>

            <p>
              <label className="form-label">Field Reps</label>
              <select
                value={fieldRepPk}
                onChange={(event) => setFieldRepPk(() => parseInt(event.target.value))}
                className="form-select"
              >
                {props.field_reps.map((field_rep) => {
                  return (
                    <option key={field_rep.pk} value={field_rep.pk}>
                      {field_rep.name}
                    </option>
                  );
                })}
              </select>
            </p>

            <ul id="store-fields" style={{ listStyle: "none", paddingLeft: 0 }}>
              {currentRepStores.map((store) => (
                <StoreManagerFieldset key={store.pk} store={store} />
              ))}
            </ul>
          </fieldset>

          <div className="text-center">
            <button type="submit" className="btn btn-primary">
              Submit
              <div
                className="spinner-border spinner-border-sm text-light visually-hidden"
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
            </button>
          </div>
        </form>
      </section>
    </Layout>
  );
}
