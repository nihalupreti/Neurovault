import { CapturePayload, ExtensionConfig } from "./types.js";

export interface CaptureResponse {
  fileId: string;
  status: "complete" | "processing";
}

export async function captureToServer(
  config: ExtensionConfig,
  payload: CapturePayload
): Promise<CaptureResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${config.apiUrl}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.secret}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function testConnection(config: ExtensionConfig): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(`${config.apiUrl}/api/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
