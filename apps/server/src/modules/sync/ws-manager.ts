import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface VaultConnection {
  ws: WebSocket;
  since: string;
}

const vaultClients = new Map<string, Set<VaultConnection>>();

let wss: WebSocketServer;

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/api\/sync\/([^/]+)\/ws$/);

    if (!match) {
      socket.destroy();
      return;
    }

    const vaultId = match[1]!;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, vaultId);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: any, vaultId: string) => {
    const conn: VaultConnection = { ws, since: "" };

    if (!vaultClients.has(vaultId)) {
      vaultClients.set(vaultId, new Set());
    }
    vaultClients.get(vaultId)!.add(conn);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "subscribe" && msg.since) {
          conn.since = msg.since;
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      vaultClients.get(vaultId)?.delete(conn);
    });
  });
}

export function notifyVaultChanged(vaultId: string, commitSha: string): void {
  const clients = vaultClients.get(vaultId);
  if (!clients) return;

  const message = JSON.stringify({
    type: "changes_available",
    commitSha,
  });

  for (const conn of clients) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
    }
  }
}

export function getConnectedClientCount(vaultId: string): number {
  return vaultClients.get(vaultId)?.size ?? 0;
}
