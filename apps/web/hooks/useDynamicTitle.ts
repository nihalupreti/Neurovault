import { useEffect } from "react";

const BASE_TITLE = "Neurovault";

export function useDynamicTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
