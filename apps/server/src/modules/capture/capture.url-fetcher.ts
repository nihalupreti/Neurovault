export interface FetchSuccess {
  ok: true;
  html: string;
  finalUrl: string;
}

export interface FetchError {
  ok: false;
  error: string;
}

export type FetchResult = FetchSuccess | FetchError;

const TIMEOUT_MS = 10_000;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function fetchUrl(url: string): Promise<FetchResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Neurovault/1.0 (content capture)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
      return { ok: false, error: "Response too large" };
    }

    const html = await response.text();

    if (html.length > MAX_SIZE_BYTES) {
      return { ok: false, error: "Response too large" };
    }

    return {
      ok: true,
      html,
      finalUrl: response.url || url,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Timeout" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Fetch failed" };
  }
}
