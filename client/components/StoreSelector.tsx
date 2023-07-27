import React, { forwardRef, useEffect, useRef, useState } from "react";

import { IFieldRep, IStore } from "@client/templates/StockTrackerScanner";

type BaseProps = {
  handleStoreSubmission: (storePk: string) => void;
};

type StoreSelectorProps = {
  stores: IStore[];
};

type Props = BaseProps &
  (
    | {
        propType: "fieldReps";
        field_reps: IFieldRep[];
      }
    | {
        propType: "stores";
        stores: IStore[];
      }
  );

function StoreSelectorInner({ stores }: StoreSelectorProps, ref: React.Ref<HTMLSelectElement>) {
  return (
    <p id="store-select-container" className="mb-3">
      <label htmlFor="store-select" className="form-label">
        Store
      </label>
      <select ref={ref} className="d-block col-12 form-select" name="store-id" required>
        {stores.map((store) => (
          <option key={store.pk} value={store.pk}>
            {store.name}
          </option>
        ))}
      </select>
    </p>
  );
}
const StoreSelector = forwardRef(StoreSelectorInner);

export function FieldRepStoreSelector(props: Props) {
  const [listedStores, setListedStores] = useState<IStore[]>([]);
  const fieldRepRef = useRef<HTMLSelectElement>(null);
  const storePkRef = useRef<HTMLSelectElement>(null);

  function onFieldRepChange() {
    if (props.propType !== "fieldReps") return;

    const fieldRepPk = fieldRepRef.current?.value;
    if (fieldRepPk === undefined) throw new Error("Field Rep Pk is undefined");

    const fieldRep = props.field_reps.find((field_rep) => field_rep.pk === parseInt(fieldRepPk));

    if (fieldRep === undefined) throw new Error(`Field Rep pk "${fieldRepPk}" not found`);
    setListedStores(() => fieldRep.stores);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storePk = storePkRef.current?.value;
    if (storePk === undefined) throw new Error("Store Pk is undefined");

    props.handleStoreSubmission(storePk);
  }

  useEffect(() => {
    if (props.propType === "stores") {
      setListedStores(() => props.stores);
    } else {
      onFieldRepChange();
    }
  }, []);

  return (
    <form onSubmit={onSubmit}>
      <fieldset className="mb-3">
        <legend>Store Selector</legend>
        {props.propType === "fieldReps" && (
          <p>
            <label htmlFor="field-representative-select" className="form-label">
              Field Representative
            </label>
            <select
              onChange={() => onFieldRepChange()}
              ref={fieldRepRef}
              className="form-select"
              id="field-representative-select"
              required>
              {props.field_reps.map((field_rep) => (
                <option key={field_rep.pk} value={field_rep.pk}>
                  {field_rep.name}
                </option>
              ))}
            </select>
          </p>
        )}
        <StoreSelector stores={listedStores} ref={storePkRef} />
      </fieldset>
      <button type="submit" className="btn btn-primary col-12 my-2">
        Submit
      </button>
    </form>
  );
}
