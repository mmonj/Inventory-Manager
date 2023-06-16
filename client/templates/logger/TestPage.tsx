import React from "react";

import { templates } from "@reactivated";

import { Layout } from "@client/components/Layout";

export default (props: templates.TestPage) => {
  return (
    <Layout title="Test Page">
      <h1>Test Page Main</h1>
      <div>Test Page props: {JSON.stringify(props)}</div>
    </Layout>
  );
};
