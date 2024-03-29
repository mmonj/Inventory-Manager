import React from "react";

import { templates } from "@reactivated";
import { ButtonGroup, Dropdown, DropdownButton } from "react-bootstrap";

interface Props extends templates.StockTrackerBarcodeSheet {
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function BarcodeSheetHeader(props: Props) {
  return (
    <section>
      <div id="company-logo-container" className="p-3 text-center">
        <img src={props.barcodeSheet.parent_company.third_party_logo_url} alt="" />
      </div>
      <h5 id="store-name-title" className="text-center">
        {props.barcodeSheet.store_name}
      </h5>
      <h6 id="item-count-indicator" className="text-center mb-3">
        {`${props.barcodeSheet.product_additions.length} shown / ${props.total_products} total items`}
      </h6>
      <div id="sheet-type-container" className="dropdown mb-3 text-center">
        <DropdownButton
          as={ButtonGroup}
          title={props.sheetTypeInfo.sheetTypeVerbose}
          id="bg-nested-dropdown"
          variant={"secondary"}
        >
          {props.possibleSheetTypesInfo.map((possiblesheetInfo, idx) => (
            <Dropdown.Item
              className={
                props.sheetTypeInfo.sheetType === possiblesheetInfo.sheetType ? "active" : ""
              }
              key={idx}
              href={"?sheet-type=" + encodeURIComponent(possiblesheetInfo.sheetType)}
              eventKey={idx}
            >
              {possiblesheetInfo.sheetTypeVerbose}
            </Dropdown.Item>
          ))}
        </DropdownButton>

        <div className="my-3">
          {props.sheetTypeInfo.sheetType === "out-of-dist" && (
            <>
              <button
                onClick={() => props.setIsEditMode((prevMode) => !prevMode)}
                type="button"
                id="edit-item-stock"
                className="btn btn-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="bi bi-pencil-square mx-2"
                  viewBox="0 0 16 16"
                >
                  <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"></path>
                  <path
                    fillRule="evenodd"
                    d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"
                  ></path>
                </svg>
                <span className="fw-semibold">Mark products as carried</span>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
