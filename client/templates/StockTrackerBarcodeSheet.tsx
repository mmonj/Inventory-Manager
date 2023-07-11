import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { BarcodeSheetContent } from "@client/components/stockTracker/BarcodeSheetContent";
import { BarcodeSheetHeader } from "@client/components/stockTracker/BarcodeSheetHeader";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { BarcodeSheetSchema, sheetTypeType } from "@client/types";

export default (props: templates.StockTrackerBarcodeSheet) => {
  BarcodeSheetSchema.parse(props);

  function handleSheetTypeChange(newSheetType: sheetTypeType) {
    const newUrl = new URL(document.location.href);
    newUrl.searchParams.set("sheet-type", newSheetType);
    document.location.href = newUrl.href;
  }

  return (
    <Layout
      title="Barcode Sheet"
      navbar={<NavigationBar />}
      extraStyles={["styles/stock_tracker/barcode_sheet.css"]}
      excludeBsBodyOverrides={true}>
      <BarcodeSheetHeader {...props} handleSheetTypeChange={handleSheetTypeChange} />
      <BarcodeSheetContent {...props} />
    </Layout>
  );
};
