import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { StoreSelector } from "@client/components/StorePicker";

export default (props: templates.ProductLocatorIndex) => {
  return (
    <Layout title="Product Locator">
      <section id="store-select-container" className="m-2 px-2 mw-rem-60 mx-auto">
        <StoreSelector stores={props.stores} isFieldRepsDisabled={true} />
      </section>
    </Layout>
  );
};
