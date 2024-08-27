import React, { useEffect, useRef, useState } from "react";

import Select, { ActionMeta, SingleValue } from "react-select";

import { FilterOptionOption } from "react-select/dist/declarations/src/filters";

import { IFieldRep, IStore } from "@client/templates/StockTrackerScanner";

const LOCALSTORAGE_LAST_REP_ID_VIEWED_KEY = "SurveyLauncherLastRepViewed";

type BaseProps = {
  handleStoreSubmission: (storePk: string) => void;
  submitButtonText?: string;
  actionOnStoreSelectChange?: () => void;
  isHandleSubmissionWithoutButton?: boolean;
};

type StoreSelectorProps = {
  stores: IStore[];
  selectedStore: TSelectOption | null;
  setSelectedStore: React.Dispatch<React.SetStateAction<TSelectOption | null>>;
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

interface TSelectOption {
  value: number;
  label: string;
}

function filterOption(option: FilterOptionOption<TSelectOption>, inputValue: string): boolean {
  const searchWords = inputValue
    .toLowerCase()
    .split(/\s+/)
    .filter(function (word) {
      return word.length > 0;
    });

  return searchWords.every((word) => {
    return option.label.toLowerCase().includes(word);
  });
}

function StoreSelector({ stores, selectedStore, setSelectedStore }: StoreSelectorProps) {
  const [searchInput, setSearchInput] = useState<string>("");

  const options: TSelectOption[] = stores
    .map((store) => ({
      value: store.pk,
      label: store.name ?? "_error: Store name is null",
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  function handleInputChange(
    inputValue: SingleValue<TSelectOption>,
    _actionMeta: ActionMeta<TSelectOption>
  ): void {
    if (inputValue) {
      setSearchInput(inputValue.label);
      setSelectedStore(inputValue);
    }
  }

  useEffect(
    function () {
      if (searchInput) {
        document.querySelector(".react-select__menu")?.scrollTo();
      }
    },
    [searchInput]
  );

  return (
    <div id="store-select-container" className="my-1 mb-3">
      <label htmlFor="store-select" className="form-label">
        Select a store
      </label>

      <Select
        required={true}
        filterOption={filterOption}
        menuShouldScrollIntoView={true}
        placeholder="Select a store"
        value={selectedStore}
        onChange={handleInputChange}
        options={options}
        classNamePrefix="react-select"
      />
    </div>
  );
}

export function FieldRepStoreSelector({
  isHandleSubmissionWithoutButton = false,
  ...props
}: Props) {
  const [listedStores, setListedStores] = useState<IStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<TSelectOption | null>(null);
  const fieldRepRef = useRef<HTMLSelectElement>(null);

  React.useEffect(() => {
    props.actionOnStoreSelectChange?.();

    if (isHandleSubmissionWithoutButton == true && selectedStore !== null) {
      props.handleStoreSubmission(selectedStore.value.toString());
    }
  }, [selectedStore]);

  function onFieldRepChange() {
    if (props.propType !== "fieldReps") return;
    if (fieldRepRef.current === null) throw new Error("fieldRepRef is null");

    setSelectedStore(() => null);
    localStorage.setItem(LOCALSTORAGE_LAST_REP_ID_VIEWED_KEY, fieldRepRef.current.value);

    const fieldRepPk = fieldRepRef.current.value;
    if (fieldRepPk === undefined) throw new Error("Field Rep Pk is undefined");

    const fieldRep = props.field_reps.find((field_rep) => field_rep.pk === parseInt(fieldRepPk));

    if (fieldRep === undefined) throw new Error(`Field Rep pk "${fieldRepPk}" not found`);
    setListedStores(() => fieldRep.stores);
  }

  function restoreFromLocalstorage() {
    if (props.propType !== "fieldReps") return;

    const lastRepIdViewed = localStorage.getItem(LOCALSTORAGE_LAST_REP_ID_VIEWED_KEY);
    if (lastRepIdViewed === null) return;

    const fieldRepData = props.field_reps.find(
      (fieldRepData) => fieldRepData.pk === Number.parseInt(lastRepIdViewed)
    );
    if (fieldRepData === undefined) return;
    if (fieldRepRef.current === null) return;

    fieldRepRef.current.value = fieldRepData.pk.toString();
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storePk = selectedStore?.value;
    if (storePk === undefined) throw new Error("Store Pk is undefined");

    props.handleStoreSubmission(storePk.toString());
  }

  useEffect(() => {
    restoreFromLocalstorage();

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
        <div className="small">{listedStores.length} stores</div>
      </fieldset>
      {isHandleSubmissionWithoutButton == false && (
        <button type="submit" className="btn btn-primary col-12 my-2 d-block">
          {props.submitButtonText ?? "Submit"}
        </button>
      )}
    </form>
  );
}
