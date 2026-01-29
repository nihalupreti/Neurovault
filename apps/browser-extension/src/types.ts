export interface ExtensionConfig {
  apiUrl: string;
  secret: string;
}

export interface CapturePayload {
  content: string;
  note?: string;
}

export type BadgeState = "capturing" | "success" | "error" | "no-config" | "idle";
