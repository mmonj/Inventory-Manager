import React, { useState } from "react";

import { Context, StoreD7Ddec6B39, templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { ProductLocatorScanner } from "@client/components/ProductLocatorScanner";
import { StoreSelector } from "@client/components/StorePicker";

export default (props: templates.ProductLocatorIndex) => {
  const [store, setStore] = useState<StoreD7Ddec6B39 | null>(null);
  const context = React.useContext(Context);

  const storeIdFromQueryParam = new URL(context.request.url).searchParams.get("store-id") ?? "";
  const storeFromQueryParam: StoreD7Ddec6B39 | undefined = props.stores.filter(
    (store) => store.pk === parseInt(storeIdFromQueryParam)
  )[0];
  if (storeFromQueryParam !== undefined && storeFromQueryParam.pk !== store?.pk) {
    setStore(() => storeFromQueryParam);
  }

  return (
    <Layout title="Product Locator">
      <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
        {!store && <StoreSelector stores={props.stores} isFieldRepsDisabled={true} />}
        {!!store && <ProductLocatorScanner storeId={store.pk} storeName={store.name} />}
      </section>
    </Layout>
  );
};
