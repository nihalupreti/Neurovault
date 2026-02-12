import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("../../files/files.model.js", () => ({
  default: {
    create: mockCreate,
  },
}));

vi.mock("../../files/files.events.js", () => ({
  emitFileUploaded: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../capture.email-rate-limiter.js", () => ({
  checkEmailRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 49 }),
}));

import express from "express";
import request from "supertest";
import { createEmailWebhookRouter } from "../capture.email-webhook.js";

function createApp(secret: string, allowlist: string) {
  const app = express();
  app.use(express.json());
  app.use("/api/capture/email", createEmailWebhookRouter(secret, allowlist));
  return app;
}

describe("POST /api/capture/email", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    const fakeId = { toString: () => "email-note-123" };
    mockCreate.mockResolvedValue({
      _id: fakeId,
      serverPath: "D:/Neurovault/uploads/test-email.md",
    });
  });

  it("returns 503 when webhook secret is not configured", async () => {
    const app = createApp("", "sender@example.com");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "anything")
      .send({ from: "sender@example.com", subject: "Hi", body: "Hello" });
    expect(res.status).toBe(503);
  });

  it("returns 401 when webhook secret does not match", async () => {
    const app = createApp("correct-secret", "sender@example.com");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "wrong-secret")
      .send({ from: "sender@example.com", subject: "Hi", body: "Hello" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when sender is not in allowlist", async () => {
    const app = createApp("my-secret", "allowed@example.com");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "my-secret")
      .send({ from: "hacker@evil.com", subject: "Hi", body: "Hello" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when body and attachments are both empty", async () => {
    const app = createApp("my-secret", "sender@example.com");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "my-secret")
      .send({ from: "sender@example.com", subject: "Hi", body: "" });
    expect(res.status).toBe(400);
  });

  it("returns 201 for valid email without attachments", async () => {
    const app = createApp("my-secret", "sender@example.com");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "my-secret")
      .send({
        from: "sender@example.com",
        subject: "Quick thought",
        date: "2025-03-25T14:30:00Z",
        body: "This is a note I want to save.",
      });
    expect(res.status).toBe(201);
    expect(res.body.fileId).toBe("email-note-123");
    expect(res.body.attachmentIds).toEqual([]);
  });

  it("allows sender comparison case-insensitive", async () => {
    const app = createApp("my-secret", "Sender@Example.com");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "my-secret")
      .send({
        from: "sender@example.com",
        subject: "Test",
        date: "2025-03-25T14:30:00Z",
        body: "Content",
      });
    expect(res.status).toBe(201);
  });

  it("returns 403 when allowlist is empty", async () => {
    const app = createApp("my-secret", "");
    const res = await request(app)
      .post("/api/capture/email")
      .set("X-Email-Webhook-Secret", "my-secret")
      .send({ from: "anyone@example.com", subject: "Hi", body: "Hello" });
    expect(res.status).toBe(403);
  });
});
