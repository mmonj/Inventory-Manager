import React from "react";

import { QueryProvider } from "@client/components/QueryProvider";

// Picked up by reactivated's SSR render. client/index.tsx wraps the hydrated tree the same way.
export default function renderer(content: React.JSX.Element): Promise<React.JSX.Element> {
  return Promise.resolve(<QueryProvider>{content}</QueryProvider>);
}
