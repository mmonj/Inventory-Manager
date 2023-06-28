import React from "react";

import { StoreD7Ddec6B39 } from "@reactivated";

interface Props {
  stores: StoreD7Ddec6B39[];
  isFieldRepsDisabled?: boolean;
}

export function StoreSelector({ stores, isFieldRepsDisabled = false }: Props) {
  function handleStoreSubmit(event: React.FormEvent): void {
    event.preventDefault();

    console.log(stores);
  }

  return (
    <form onSubmit={handleStoreSubmit} id="store-selector-form">
      <fieldset>
        <legend className="mb-3">Store Selector</legend>
        {!isFieldRepsDisabled && (
          <>
            <div id="field-representative-container" className="mb-3">
              <label htmlFor="field-representative-select" className="form-label">
                Field Representative
              </label>
              <select
                id="field-representative-select"
                className="form-select"
                name="field-rep-id"
                required></select>
            </div>
          </>
        )}
        <div id="store-select-container" className="mb-3">
          <label htmlFor="store-select" className="form-label">
            Store
          </label>
          <select id="store-select" className="d-block col-12 form-select" name="store-id" required>
            {stores.map((store) => (
              <option key={store.pk} value={store.pk}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary col-12 my-2">
          Submit
        </button>
      </fieldset>
    </form>
  );
}
