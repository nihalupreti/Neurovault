import { Request, Response, NextFunction } from "express";
import { connectMongo } from "@neurovault/config";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import fileRoutes from "./modules/files/routes.js";
import searchRoutes from "./modules/search/routes.js";
import syncRoutes from "./modules/sync/routes.js";
import qaRoutes from "./modules/qa/qa-routes.js";
import graphRoutes from "./modules/graph/graph-routes.js";
import captureRoutes from "./modules/capture/capture-routes.js";
import { createEmailWebhookRouter } from "./modules/capture/email-webhook.js";
import { initConstraints } from "./modules/graph/graph-service.js";
import { initWebSocket } from "./modules/sync/ws-manager.js";
import { identifyRole } from "./modules/auth/identify-role.js";
import authRoutes from "./modules/auth/auth-routes.js";

dotenv.config();

if (!process.env.DB_URL) {
  console.error("FATAL: DB_URL environment variable is required");
  process.exit(1);
}

connectMongo(process.env.DB_URL);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3000"];

app.use(helmet());
app.use(
  cors<Request>({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(
  "/api/capture/email",
  createEmailWebhookRouter(
    process.env.EMAIL_WEBHOOK_SECRET || "",
    process.env.EMAIL_ALLOWLIST || ""
  )
);
app.use(identifyRole);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/file", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/capture", captureRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const server = createServer(app);
initWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on port ${PORT}`);
  initConstraints().catch((err) =>
    console.error("Neo4j constraint init failed:", err)
  );
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
