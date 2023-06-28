import React, { useState } from "react";

import { Context, templates } from "@reactivated";

import { BarcodeScanner } from "@client/components/BarcodeScanner";
import { Layout } from "@client/components/Layout";
import { StoreSelector } from "@client/components/StorePicker";

export default (props: templates.ProductLocatorIndex) => {
  const [storeId, setStoreId] = useState<string>("");
  const context = React.useContext(Context);

  const storeIdFromQueryParam = new URL(context.request.url).searchParams.get("store-id") ?? "";
  if (storeId !== storeIdFromQueryParam) {
    setStoreId(() => storeIdFromQueryParam);
  }

  return (
    <Layout title="Product Locator">
      <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
        {!props.stores.some((store) => store.pk === parseInt(storeId)) && (
          <StoreSelector stores={props.stores} isFieldRepsDisabled={true} />
        )}
        {props.stores.some((store) => store.pk === parseInt(storeId)) && <BarcodeScanner />}
      </section>
    </Layout>
  );
};
