import React, { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * One QueryClient per render tree, so SSR requests never share a cache. Retries are off since
 * failures here are mostly 4xx responses carrying messages meant for the user.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
