export class WsClient {
  private ws: WebSocket | null = null;
  private callback: ((commitSha: string) => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private backoffMs = 1000;
  private failCount = 0;
  private serverUrl = "";
  private vaultId = "";
  private stopped = false;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollFn: (() => void) | null = null;

  connect(serverUrl: string, vaultId: string): void {
    this.serverUrl = serverUrl;
    this.vaultId = vaultId;
    this.stopped = false;
    this.doConnect();
  }

  disconnect(): void {
    this.stopped = true;
    this.cleanup();
  }

  onChangesAvailable(callback: (commitSha: string) => void): void {
    this.callback = callback;
  }

  setPollFallback(fn: () => void): void {
    this.pollFn = fn;
  }

  private doConnect(): void {
    if (this.stopped) return;

    const wsUrl = this.serverUrl
      .replace(/^http/, "ws")
      .replace(/\/$/, "");

    try {
      this.ws = new WebSocket(`${wsUrl}/api/sync/${this.vaultId}/ws`);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.backoffMs = 1000;
      this.failCount = 0;
      this.stopPolling();
      this.startHeartbeat();
      this.callback?.("");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "changes_available" && this.callback) {
          this.callback(msg.commitSha);
        }
      } catch {
        // ignore malformed
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.stopped) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    this.failCount++;

    if (this.failCount >= 3 && !this.pollTimer) {
      this.startPolling();
    }

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, this.backoffMs);

    this.backoffMs = Math.min(this.backoffMs * 2, 30000);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startPolling(): void {
    if (this.pollTimer || !this.pollFn) return;
    this.pollTimer = setInterval(() => {
      this.pollFn?.();
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
