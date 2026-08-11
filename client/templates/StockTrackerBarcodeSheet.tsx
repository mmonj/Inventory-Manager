import React, { useMemo, useState } from "react";

import { templates } from "@reactivated";

import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Layout } from "@client/components/Layout";
import { BarcodeSheetContent } from "@client/components/stockTracker/BarcodeSheetContent";
import { BarcodeSheetHeader } from "@client/components/stockTracker/BarcodeSheetHeader";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { BarcodeSheetSchema, sheetTypeType } from "@client/types";

import "@client/scss/stock_tracker/barcode_sheet.scss";

export function Template(props: templates.StockTrackerBarcodeSheet) {
  const [isEditMode, setIsEditMode] = useState(false);
  // Lifted to state (rather than driven by a page reload) so switching sheet types is a
  // client-side re-filter of the already-loaded product_additions - the URL's ?sheet-type=
  // is kept in sync via history.replaceState so reload/bookmark/share still reflect it.
  const [sheetType, setSheetType] = useState<sheetTypeType>(props.sheetTypeInfo.sheetType);

  BarcodeSheetSchema.parse(props);

  const sheetTypeInfo =
    props.possibleSheetTypesInfo.find((info) => info.sheetType === sheetType) ??
    props.sheetTypeInfo;

  function handleChangeSheetType(newSheetType: sheetTypeType) {
    setSheetType(newSheetType);

    const url = new URL(window.location.href);
    url.searchParams.set("sheet-type", newSheetType);
    window.history.replaceState(null, "", url);
  }

  // The server always sends every product_addition on the sheet regardless of sheet-type, so
  // switching sheet types (e.g. for printing) doesn't require a new request - the client
  // filters by is_carried here, once, and passes the filtered list down to both children.
  const visibleProductAdditions = useMemo(() => {
    if (sheetType === "all-products") {
      return props.barcodeSheet.product_additions;
    }

    const wantsCarried = sheetType === "in-dist";
    return props.barcodeSheet.product_additions.filter(
      (product_addition) => product_addition.is_carried === wantsCarried
    );
  }, [props.barcodeSheet.product_additions, sheetType]);

  return (
    <Layout
      title={`Barcode Sheet for ${props.barcodeSheet.parent_company.expanded_name}: ${props.barcodeSheet.store_name}`}
      navbar={<NavigationBar extraClassName="bg-light navbar-light " />}
      bsTheme="dark"
      className="barcode-sheet-main"
    >
      <button
        onClick={() => window.print()}
        type="button"
        title="Print / Save as PDF"
        className="print-button btn btn-outline-secondary rounded-circle bg-black"
      >
        <FontAwesomeIcon icon={faPrint} size="lg" />
      </button>

      <BarcodeSheetHeader
        {...props}
        sheetTypeInfo={sheetTypeInfo}
        onChangeSheetType={handleChangeSheetType}
        visibleProductAdditions={visibleProductAdditions}
        setIsEditMode={setIsEditMode}
      />
      <BarcodeSheetContent
        {...props}
        sheetTypeInfo={sheetTypeInfo}
        visibleProductAdditions={visibleProductAdditions}
        isEditMode={isEditMode}
      />
    </Layout>
  );
}
