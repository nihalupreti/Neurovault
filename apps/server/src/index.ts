import { Request } from "express";
import { connectMongo } from "@neurovault/config";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { requestId } from "./middleware/request-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createServer } from "http";
import fileRoutes from "./modules/files/files.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import syncRoutes from "./modules/sync/sync.routes.js";
import qaRoutes from "./modules/qa/qa.routes.js";
import graphRoutes from "./modules/graph/graph.routes.js";
import captureRoutes from "./modules/capture/capture.routes.js";
import { createEmailWebhookRouter } from "./modules/capture/capture.email-webhook.js";
import { initConstraints } from "./modules/graph/graph.service.js";
import { initWebSocket } from "./modules/sync/sync.ws-manager.js";
import { startWorkers } from "./modules/worker/worker.processor.js";
import { identifyRole } from "./modules/auth/auth.middleware.js";
import { apiSuccess } from "./utils/api-response.js";
import authRoutes from "./modules/auth/auth.routes.js";
import bookRoutes from "./modules/books/books.routes.js";
import readerRoutes from "./modules/reader/reader.routes.js";

dotenv.config();

const REQUIRED_ENV = ["DB_URL", "ADMIN_SECRET", "JINA_API_KEY", "REDIS_URL"] as const;
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

connectMongo(process.env.DB_URL!);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : ["http://localhost:3000"];

app.set("trust proxy", 1);
app.use(requestId);
app.use(helmet());
app.use(
  cors<Request>({
    origin: allowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api/capture/email",
  createEmailWebhookRouter(
    process.env.EMAIL_WEBHOOK_SECRET || "",
    process.env.EMAIL_ALLOWLIST || "",
  ),
);
app.use(identifyRole);

app.get("/api/health", (_req, res) => {
  apiSuccess(res, { status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/file", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/sync", express.json({ limit: "10mb" }), syncRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/capture", captureRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/reader", readerRoutes);

app.use(errorHandler);

const server = createServer(app);
initWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`server is running on port ${PORT}`);
  initConstraints().catch((err) => console.error("Neo4j constraint init failed:", err));
  startWorkers();
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
