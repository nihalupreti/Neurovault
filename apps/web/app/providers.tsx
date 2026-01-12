"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { HighlightProvider } from "@/contexts/HighlightContext";
import { queryClient } from "@/utils/http";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HighlightProvider>{children}</HighlightProvider>
    </QueryClientProvider>
  );
}
