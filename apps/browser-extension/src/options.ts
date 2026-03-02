import { getConfig, saveConfig } from "./storage.js";
import { testConnection } from "./api.js";
import { ExtensionConfig } from "./types.js";

const apiUrlInput = document.getElementById("api-url") as HTMLInputElement;
const secretInput = document.getElementById("secret") as HTMLInputElement;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const testBtn = document.getElementById("test-btn") as HTMLButtonElement;
const pasteBtn = document.getElementById("paste-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

async function init() {
  const config = await getConfig();
  if (config) {
    apiUrlInput.value = config.apiUrl;
    secretInput.value = config.secret;
  }
}

function showStatus(message: string, type: "success" | "error") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
}

saveBtn.addEventListener("click", async () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
  const secret = secretInput.value.trim();

  if (!apiUrl || !secret) {
    showStatus("Both fields are required", "error");
    return;
  }

  await saveConfig({ apiUrl, secret });
  showStatus("Settings saved!", "success");
});

testBtn.addEventListener("click", async () => {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
  const secret = secretInput.value.trim();

  if (!apiUrl) {
    showStatus("Enter a server URL first", "error");
    return;
  }

  const ok = await testConnection({ apiUrl, secret });
  if (ok) {
    showStatus("Connected successfully!", "success");
  } else {
    showStatus("Connection failed — check the URL", "error");
  }
});

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    const url = new URL(text);
    const configParam = url.searchParams.get("config");

    if (!configParam) {
      showStatus("No config found in clipboard URL", "error");
      return;
    }

    const decoded = JSON.parse(atob(configParam)) as ExtensionConfig;
    if (!decoded.apiUrl || !decoded.secret) {
      showStatus("Invalid config format", "error");
      return;
    }

    apiUrlInput.value = decoded.apiUrl;
    secretInput.value = decoded.secret;
    await saveConfig(decoded);
    showStatus("Connected via link!", "success");
  } catch {
    showStatus("Could not parse clipboard content as a connect link", "error");
  }
});

init();
