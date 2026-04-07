import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { JinaProvider } from "@neurovault/utils/embeddings/jina.provider";

function makeOkResponse(embedding: number[]) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: [{ embedding }] }),
    text: () => Promise.resolve(""),
  };
}

describe("JinaProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.JINA_API_KEY = "test-key";
  });

  it("exposes 1024 dimensions", () => {
    expect(new JinaProvider().dimensions).toBe(1024);
  });

  it("maps document task to retrieval.passage", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "document");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.task).toBe("retrieval.passage");
  });

  it("maps query task to retrieval.query", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "query");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.task).toBe("retrieval.query");
  });

  it("sends normalized: true", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "query");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.normalized).toBe(true);
  });

  it("sends Authorization header with JINA_API_KEY", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "query");
    expect(mockFetch.mock.calls[0][1].headers["Authorization"]).toBe("Bearer test-key");
  });

  it("returns the embedding array", async () => {
    const expected = new Array(1024).fill(0.5);
    mockFetch.mockResolvedValue(makeOkResponse(expected));
    const result = await new JinaProvider().embed("hello", "query");
    expect(result).toEqual(expected);
  });

  it("throws on non-2xx response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    await expect(new JinaProvider().embed("hello", "query")).rejects.toThrow("Jina API error 401");
  });

  it("throws on empty embedding", async () => {
    mockFetch.mockResolvedValue(makeOkResponse([]));
    await expect(new JinaProvider().embed("hello", "query")).rejects.toThrow("empty embedding");
  });
});
