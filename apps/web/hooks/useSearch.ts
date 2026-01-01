"use client";

import { useQuery } from "@tanstack/react-query";
import { search } from "@/api/client";
import type { SearchResponse } from "@/api/client";

export type SearchMode = "hybrid" | "semantic" | "keyword" | "file";

function detectMode(query: string): { mode: SearchMode; cleanQuery: string } {
  if (query.startsWith("!file:"))
    return { mode: "file", cleanQuery: query.slice(6).trim() };
  if (query.startsWith("!keyword:"))
    return { mode: "keyword", cleanQuery: query.slice(9).trim() };
  if (query.startsWith("!semantic:"))
    return { mode: "semantic", cleanQuery: query.slice(10).trim() };
  return { mode: "hybrid", cleanQuery: query.trim() };
}

export function useSearch(query: string) {
  const { mode, cleanQuery } = detectMode(query);

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["search", query],
    queryFn: () => search(query),
    enabled: cleanQuery.length > 0,
    staleTime: 30_000,
  });

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    parsed: data?.parsed ?? null,
    searchTime: data?.searchTime ?? 0,
    mode,
    cleanQuery,
    isLoading,
    error,
  };
}
