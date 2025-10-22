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
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}${endPoint}`,
    data,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percent}%`);
        }
      },
    }
  );
  return response.data;
}

export async function getData({ endPoint }: { endPoint: string }) {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}${endPoint}`
  );
  return response.data;
}
