import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";
import { StorePicker } from "@client/components/StorePicker";

export default (props: templates.ProductLocatorIndex) => {
  return (
    <Layout title="Product Locator">
      <div>Hello there props: {JSON.stringify(props)}</div>
      <StorePicker />
    </Layout>
  );
};
