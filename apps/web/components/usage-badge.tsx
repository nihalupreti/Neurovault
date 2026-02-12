"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios-instance";
import { ENDPOINTS } from "@/api/endpoints";
import { useAuth } from "@/contexts/auth-context";

export function UsageBadge() {
  const { isAdmin } = useAuth();

  const { data } = useQuery({
    queryKey: ["usage"],
    queryFn: async () => {
      const { data } = await api.get(ENDPOINTS.auth.usage);
      return data as { today: { guest: number; global: number }; limits: { globalDaily: number } };
    },
    enabled: isAdmin,
    refetchInterval: 30_000,
  });

  if (!isAdmin || !data) return null;

  return (
    <span className="nv-usage-badge" title="Guest queries used today">
      {data.today.global}/{data.limits.globalDaily}
    </span>
  );
}
