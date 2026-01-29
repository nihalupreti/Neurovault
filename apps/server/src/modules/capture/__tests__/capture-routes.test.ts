import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindByIdAndUpdate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindByIdAndUpdate: vi.fn(),
}));

vi.mock("../../files/files.model.js", () => ({
  default: {
    create: mockCreate,
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

vi.mock("../../files/files.events.js", () => ({
  emitFileUploaded: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import express from "express";
import request from "supertest";
import captureRoutes from "../capture.routes.js";

function createApp(role: "admin" | "guest") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.role = role;
    next();
  });
  app.use("/api/capture", captureRoutes);
  return app;
}

describe("POST /api/capture", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindByIdAndUpdate.mockReset();
    const fakeId = { toString: () => "test-id-123" };
    mockCreate.mockResolvedValue({
      _id: fakeId,
      serverPath: "D:/Neurovault/uploads/test.md",
    });
  });

  it("returns 401 for guest role", async () => {
    const app = createApp("guest");
    const res = await request(app)
      .post("/api/capture")
      .send({ content: "hello" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty content", async () => {
    const app = createApp("admin");
    const res = await request(app)
      .post("/api/capture")
      .send({ content: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing content", async () => {
    const app = createApp("admin");
    const res = await request(app)
      .post("/api/capture")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 201 with fileId for raw text", async () => {
    const app = createApp("admin");
    const res = await request(app)
      .post("/api/capture")
      .send({ content: "A quick note about something" });
    expect(res.status).toBe(201);
    expect(res.body.fileId).toBe("test-id-123");
    expect(res.body.status).toBe("complete");
  });

  it("returns 201 with processing status for URL", async () => {
    const app = createApp("admin");
    const res = await request(app)
      .post("/api/capture")
      .send({ content: "https://example.com/article" });
    expect(res.status).toBe(201);
    expect(res.body.fileId).toBe("test-id-123");
    expect(res.body.status).toBe("processing");
  });
});
