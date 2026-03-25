"use client";

import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries globally, default was 3 times
    },
  },
});

export async function uploadFiles({
  endPoint,
  data,
}: {
  endPoint: string;
  data: FormData;
}) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const response = await axios.post(`${base}${endPoint}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });
  return response.data;
}
