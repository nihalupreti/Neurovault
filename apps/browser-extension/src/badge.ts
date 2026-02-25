import { BadgeState } from "./types.js";

const api = typeof browser !== "undefined" ? browser : chrome;

const BADGE_CONFIG: Record<BadgeState, { text: string; color: string }> = {
  capturing: { text: "...", color: "#3B82F6" },
  success: { text: "✓", color: "#22C55E" },
  error: { text: "✗", color: "#EF4444" },
  "no-config": { text: "!", color: "#EAB308" },
  idle: { text: "", color: "#000000" },
};

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function setBadge(state: BadgeState, tabId?: number): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  const config = BADGE_CONFIG[state];
  const target = tabId ? { tabId } : {};

  api.action.setBadgeText({ text: config.text, ...target });
  api.action.setBadgeBackgroundColor({ color: config.color, ...target });

  if (state === "success" || state === "error") {
    clearTimer = setTimeout(() => {
      setBadge("idle", tabId);
    }, 2000);
  }
}
