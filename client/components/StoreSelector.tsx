import React, { useEffect, useRef, useState } from "react";

import Select from "react-select";

import { IFieldRep, IStore } from "@client/templates/StockTrackerScanner";

type BaseProps = {
  handleStoreSubmission: (storePk: string) => void;
  submitButtonText?: string;
  actionOnStoreSelectChange?: () => void;
};

type StoreSelectorProps = {
  stores: IStore[];
  selectedStore: StoreSelectOption | null;
  setSelectedStore: React.Dispatch<React.SetStateAction<StoreSelectOption | null>>;
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

interface StoreSelectOption {
  value: number;
  label: string;
}

function StoreSelector({ stores, selectedStore, setSelectedStore }: StoreSelectorProps) {
  const options: StoreSelectOption[] = stores
    .map((store) => ({
      value: store.pk,
      label: store.name ?? "_error: Null store name",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div id="store-select-container" className="my-1 mb-3">
      <label htmlFor="store-select" className="form-label">
        Store
      </label>

      <Select
        required={true}
        menuShouldScrollIntoView={true}
        placeholder="Select a store"
        value={selectedStore}
        onChange={setSelectedStore}
        options={options}
        classNamePrefix="react-select"
      />
    </div>
  );
}

export function FieldRepStoreSelector(props: Props) {
  const [listedStores, setListedStores] = useState<IStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreSelectOption | null>(null);
  const fieldRepRef = useRef<HTMLSelectElement>(null);

  React.useEffect(() => {
    props.actionOnStoreSelectChange?.();
  }, [selectedStore]);

  function onFieldRepChange() {
    if (props.propType !== "fieldReps") return;
    setSelectedStore(() => null);

    const fieldRepPk = fieldRepRef.current?.value;
    if (fieldRepPk === undefined) throw new Error("Field Rep Pk is undefined");

    const fieldRep = props.field_reps.find((field_rep) => field_rep.pk === parseInt(fieldRepPk));

    if (fieldRep === undefined) throw new Error(`Field Rep pk "${fieldRepPk}" not found`);
    setListedStores(() => fieldRep.stores);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storePk = selectedStore?.value;
    if (storePk === undefined) throw new Error("Store Pk is undefined");

    props.handleStoreSubmission(storePk.toString());
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
              required
            >
              {props.field_reps.map((field_rep) => (
                <option key={field_rep.pk} value={field_rep.pk}>
                  {field_rep.name}
                </option>
              ))}
            </select>
          </p>
        )}
        <StoreSelector
          stores={listedStores}
          selectedStore={selectedStore}
          setSelectedStore={setSelectedStore}
        />
      </fieldset>
      <button type="submit" className="btn btn-primary col-12 my-2 d-block">
        {props.submitButtonText ?? "Submit"}
      </button>
    </form>
  );
}
