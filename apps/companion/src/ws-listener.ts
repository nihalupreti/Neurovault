import WebSocket from "ws";
import { log } from "./config.js";

export class WsListener {
  private ws: WebSocket | null = null;
  private callback: (() => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private stopped = false;
  private serverUrl = "";
  private vaultId = "";

  connect(serverUrl: string, vaultId: string): void {
    this.serverUrl = serverUrl;
    this.vaultId = vaultId;
    this.stopped = false;
    this.doConnect();
  }

  disconnect(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  onChanges(callback: () => void): void {
    this.callback = callback;
  }

  private doConnect(): void {
    if (this.stopped) return;

    const wsUrl = this.serverUrl.replace(/^http/, "ws").replace(/\/$/, "");
    const url = `${wsUrl}/api/sync/${this.vaultId}/ws`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      log(`[${this.vaultId}] WebSocket connected`);
      this.backoffMs = 1000;
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "changes_available") {
          this.callback?.();
        }
      } catch {}
    });

    this.ws.on("close", () => {
      if (!this.stopped) this.scheduleReconnect();
    });

    this.ws.on("error", () => {
      this.ws?.close();
    });
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => this.doConnect(), this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 2, 30000);
  }
}
