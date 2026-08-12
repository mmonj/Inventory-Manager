import React, { useEffect, useMemo, useRef, useState } from "react";

import Button from "react-bootstrap/Button";
import Select, { ActionMeta, SingleValue } from "react-select";
import { FilterOptionOption } from "react-select/dist/declarations/src/filters";

import { faCheckCircle, faStore, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { IFieldRep, IStore } from "@client/templates/StockTrackerScanner";

const LOCALSTORAGE_LAST_REP_ID_VIEWED_KEY = "SurveyLauncherLastRepViewed";
// Sentinel value for the "All Reps" <option>
const ALL_REPS_VALUE = "-1";
// A single rep's store list only shows stores scanned within this window.
// "All Reps" will show all stores regardless of this window.
const RECENTLY_SEEN_STORE_WINDOW_DAYS = 90;

function isRecentlySeen(store: IStore): boolean {
  if (store.last_seen === null || store.last_seen === undefined) return false;
  const daysSinceLastSeen = (Date.now() - new Date(store.last_seen).getTime()) / 86_400_000;
  return daysSinceLastSeen <= RECENTLY_SEEN_STORE_WINDOW_DAYS;
}

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

  // Memoized since this is a full map+sort of `stores`, which can be all-reps-combined
  // (potentially hundreds+ of stores) rather than one rep's subset - without this, every
  // unrelated re-render (e.g. typing in the search box) would redo that work for no reason.
  const options: TSelectOption[] = useMemo(
    () =>
      stores
        .map((store) => ({
          value: store.pk,
          label: store.name ?? "_error: Store name is null",
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [stores]
  );

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
    <div id="store-select-container" className="mb-3">
      <label htmlFor="store-select" className="form-label fw-semibold">
        <FontAwesomeIcon icon={faStore} className="me-2 text-primary" />
        Select a store
        <span className="text-muted ms-2">({stores.length} listed)</span>
      </label>

      <Select
        required={true}
        filterOption={filterOption}
        menuShouldScrollIntoView={true}
        placeholder="Search for a store..."
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

  const fieldReps = props.propType === "fieldReps" ? props.field_reps : null;

  // Flattened, deduplicated (a store can be shared across reps) list of every store across
  // every field rep - null when propType isn't "fieldReps" ("All Reps" is only meaningful in
  // that mode). Memoized since this scans every rep's stores, which "All Reps" selection
  // would otherwise redo on every render.
  const allRepsStores = useMemo(() => {
    if (fieldReps === null) return [];

    const storesByPk = new Map<number, IStore>();
    for (const field_rep of fieldReps) {
      for (const store of field_rep.stores) {
        storesByPk.set(store.pk, store);
      }
    }
    return Array.from(storesByPk.values());
  }, [fieldReps]);

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

    if (fieldRepRef.current.value === ALL_REPS_VALUE) {
      setListedStores(() => allRepsStores);
      return;
    }

    const fieldRepPk = fieldRepRef.current.value;
    const fieldRep = props.field_reps.find((field_rep) => field_rep.pk === parseInt(fieldRepPk));

    if (fieldRep === undefined) throw new Error(`Field Rep pk "${fieldRepPk}" not found`);
    setListedStores(() => fieldRep.stores.filter(isRecentlySeen));
  }

  function restoreFromLocalstorage() {
    if (props.propType !== "fieldReps") return;

    const lastRepIdViewed = localStorage.getItem(LOCALSTORAGE_LAST_REP_ID_VIEWED_KEY);
    if (lastRepIdViewed === null) return;
    if (fieldRepRef.current === null) return;

    if (lastRepIdViewed === ALL_REPS_VALUE) {
      fieldRepRef.current.value = ALL_REPS_VALUE;
      return;
    }

    const fieldRepData = props.field_reps.find(
      (fieldRepData) => fieldRepData.pk === Number.parseInt(lastRepIdViewed)
    );
    if (fieldRepData === undefined) return;

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
        <legend className="h5 mb-3">Store Selector</legend>
        {props.propType === "fieldReps" && (
          <div className="mb-3">
            <label htmlFor="field-representative-select" className="form-label fw-semibold">
              <FontAwesomeIcon icon={faUser} className="me-2 text-primary" />
              Field Representative
            </label>
            <select
              onChange={() => onFieldRepChange()}
              ref={fieldRepRef}
              className="form-select form-select-lg"
              id="field-representative-select"
              required
            >
              <option value={ALL_REPS_VALUE}>All Reps</option>
              {props.field_reps.map((field_rep) => (
                <option key={field_rep.pk} value={field_rep.pk}>
                  {field_rep.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <StoreSelector
          stores={listedStores}
          selectedStore={selectedStore}
          setSelectedStore={setSelectedStore}
        />
      </fieldset>
      {isHandleSubmissionWithoutButton == false && (
        <Button type="submit" variant="primary" size="lg" className="w-100">
          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
          {props.submitButtonText ?? "Submit"}
        </Button>
      )}
    </form>
  );
}
