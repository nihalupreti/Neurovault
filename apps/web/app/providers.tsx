"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { HighlightProvider } from "@/contexts/HighlightContext";
import { AuthProvider } from "@/contexts/auth-context";
import { SelectionContextProvider } from "@/contexts/selection-context";
import { queryClient } from "@/api/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HighlightProvider>
          <SelectionContextProvider>{children}</SelectionContextProvider>
        </HighlightProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
