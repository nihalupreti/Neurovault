import { getConfig, saveConfig } from "./storage.js";
import { captureToServer } from "./api.js";
import { setBadge } from "./badge.js";
import { ExtensionConfig } from "./types.js";

const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: "save-page",
    title: "Save page to Neurovault",
    contexts: ["page"],
  });

  api.contextMenus.create({
    id: "save-selection",
    title: "Save selection to Neurovault",
    contexts: ["selection"],
  });

  checkConfig();
});

api.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;
  await capture({ content: tab.url }, tab.id);
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-page") {
    const url = info.pageUrl || tab?.url;
    if (!url) return;
    await capture({ content: url }, tab?.id);
  }

  if (info.menuItemId === "save-selection" && info.selectionText) {
    const pageUrl = info.pageUrl || tab?.url || "";
    await capture(
      { content: info.selectionText, note: `Highlighted from ${pageUrl}` },
      tab?.id
    );
  }
});

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "connect") {
    const config: ExtensionConfig = { apiUrl: message.url, secret: message.secret };
    saveConfig(config).then(() => {
      setBadge("idle");
      sendResponse({ success: true });
    });
    return true;
  }
});

async function capture(
  payload: { content: string; note?: string },
  tabId?: number
): Promise<void> {
  const config = await getConfig();
  if (!config) {
    setBadge("no-config", tabId);
    api.runtime.openOptionsPage();
    return;
  }

  setBadge("capturing", tabId);

  try {
    await captureToServer(config, payload);
    setBadge("success", tabId);
  } catch (err) {
    console.error("Capture failed:", err);
    setBadge("error", tabId);
  }
}

async function checkConfig(): Promise<void> {
  const config = await getConfig();
  if (!config) {
    setBadge("no-config");
  }
}
