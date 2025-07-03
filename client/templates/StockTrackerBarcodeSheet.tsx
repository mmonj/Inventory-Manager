import React, { useState } from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { BarcodeSheetContent } from "@client/components/stockTracker/BarcodeSheetContent";
import { BarcodeSheetHeader } from "@client/components/stockTracker/BarcodeSheetHeader";
import { NavigationBar } from "@client/components/stockTracker/NavigationBar";
import { BarcodeSheetSchema } from "@client/types";

export function Template(props: templates.StockTrackerBarcodeSheet) {
  const [isEditMode, setIsEditMode] = useState(false);

  BarcodeSheetSchema.parse(props);

  return (
    <Layout
      title={`Barcode Sheet for ${props.barcodeSheet.parent_company.expanded_name}: ${props.barcodeSheet.store_name}`}
      navbar={<NavigationBar />}
      extraStyles={["styles/stock_tracker/barcode_sheet.css"]}
      excludeBsBodyOverrides={true}
    >
      <BarcodeSheetHeader {...props} setIsEditMode={setIsEditMode} />
      <BarcodeSheetContent {...props} isEditMode={isEditMode} />
    </Layout>
  );
}
