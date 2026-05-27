"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { VersionWatcher } from "./version-watcher";
import { ColorThemeProvider } from "./color-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ColorThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <VersionWatcher />
      </QueryClientProvider>
    </ColorThemeProvider>
  );
}
