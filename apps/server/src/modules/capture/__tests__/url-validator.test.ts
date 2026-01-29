// apps/server/src/modules/capture/__tests__/url-validator.test.ts
import { describe, it, expect } from "vitest";
import { validateUrl } from "../capture.url-validator.js";

describe("validateUrl", () => {
  it("accepts valid https URL", () => {
    const result = validateUrl("https://example.com/article");
    expect(result.valid).toBe(true);
  });

  it("accepts valid http URL", () => {
    const result = validateUrl("http://example.com/page");
    expect(result.valid).toBe(true);
  });

  it("rejects file:// scheme", () => {
    const result = validateUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("scheme");
  });

  it("rejects javascript: scheme", () => {
    const result = validateUrl("javascript:alert(1)");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("scheme");
  });

  it("rejects data: URI", () => {
    const result = validateUrl("data:text/html,<script>alert(1)</script>");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("scheme");
  });

  it("rejects ftp:// scheme", () => {
    const result = validateUrl("ftp://files.example.com/doc");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("scheme");
  });

  it("rejects localhost", () => {
    const result = validateUrl("http://localhost:3000/admin");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("private");
  });

  it("rejects 127.0.0.1", () => {
    const result = validateUrl("http://127.0.0.1/secret");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("private");
  });

  it("rejects 10.x.x.x private range", () => {
    const result = validateUrl("http://10.0.0.1/internal");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("private");
  });

  it("rejects 172.16.x.x private range", () => {
    const result = validateUrl("http://172.16.0.1/internal");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("private");
  });

  it("rejects 192.168.x.x private range", () => {
    const result = validateUrl("http://192.168.1.1/router");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("private");
  });

  it("rejects 169.254.x.x link-local", () => {
    const result = validateUrl("http://169.254.169.254/metadata");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("private");
  });

  it("rejects malformed URL", () => {
    const result = validateUrl("not a url at all");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Invalid URL");
  });

  it("rejects empty string", () => {
    const result = validateUrl("");
    expect(result.valid).toBe(false);
  });
});
