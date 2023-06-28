import React, { useRef } from "react";

interface Props {
  stores: {
    pk: number;
    name: string;
  }[];
  isFieldRepsDisabled?: boolean;
}

function FieldRepFieldset() {
  return (
    <div id="field-representative-container" className="mb-3">
      <label htmlFor="field-representative-select" className="form-label">
        Field Representative
      </label>
      <select className="form-select" name="field-rep-id" required></select>
    </div>
  );
}

export function StoreSelector({ stores, isFieldRepsDisabled = false }: Props) {
  const storeIdRef = useRef<HTMLSelectElement>(null);

  function handleStoreSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (storeIdRef.current) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("store-id", storeIdRef.current.value);
      window.location.href = newUrl.href;
    }
  }

  return (
    <form onSubmit={handleStoreSubmit} id="store-selector-form">
      <fieldset>
        <legend className="mb-3">Store Selector</legend>
        {!isFieldRepsDisabled && <FieldRepFieldset />}

        <div id="store-select-container" className="mb-3">
          <label htmlFor="store-select" className="form-label">
            Store
          </label>
          <select ref={storeIdRef} className="d-block col-12 form-select" name="store-id" required>
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
