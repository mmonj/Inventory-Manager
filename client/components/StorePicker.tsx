import React from "react";

export function StorePicker() {
  return (
    <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
      <form id="store-selector-form">
        <fieldset>
          <legend className="mb-3">Store Selector</legend>
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
          <div id="store-select-container" className="mb-3">
            <label htmlFor="store-select" className="form-label">
              Store
            </label>
            <select
              id="store-select"
              className="d-block col-12 form-select"
              name="store-id"
              required></select>
          </div>
          <button type="submit" className="btn btn-primary col-12 my-2">
            Submit
          </button>
        </fieldset>
      </form>
    </section>
  );
}
