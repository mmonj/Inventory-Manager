import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { BarcodeSheetContent } from "@client/components/productLogger/BarcodeSheetContent";
import { BarcodeSheetHeader } from "@client/components/productLogger/BarcodeSheetHeader";
import { NavbarProductLogger } from "@client/components/productLogger/NavbarProductLogger";
import { BarcodeSheetSchema, sheetTypeType } from "@client/types";

export default (props: templates.LoggerBarcodeSheet) => {
  BarcodeSheetSchema.parse(props);

  function handleSheetTypeChange(newSheetType: sheetTypeType) {
    const newUrl = new URL(document.location.href);
    newUrl.searchParams.set("sheet-type", newSheetType);
    document.location.href = newUrl.href;
  }

  return (
    <Layout
      title="Barcode Sheet"
      navbarComponent={<NavbarProductLogger />}
      extraStyles={["styles/logger/barcode_sheet.css"]}>
      <BarcodeSheetHeader {...props} handleSheetTypeChange={handleSheetTypeChange} />
      <BarcodeSheetContent {...props} />
    </Layout>
  );
};
