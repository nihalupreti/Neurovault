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
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.task).toBe("retrieval.passage");
  });

  it("maps query task to retrieval.query", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "query");
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.task).toBe("retrieval.query");
  });

  it("sends normalized: true", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "query");
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.normalized).toBe(true);
  });

  it("sends Authorization header with JINA_API_KEY", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(new Array(1024).fill(0.1)));
    await new JinaProvider().embed("hello", "query");
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-key");
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

  it("embedBatch sends late_chunking flag", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          data: [
            { embedding: new Array(1024).fill(0.1) },
            { embedding: new Array(1024).fill(0.2) },
          ],
        }),
      text: () => Promise.resolve(""),
    });

    await new JinaProvider().embedBatch(["hello", "world"], "document", true);
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.late_chunking).toBe(true);
    expect(body.input).toEqual(["hello", "world"]);
  });

  it("embedBatch returns array of embeddings", async () => {
    const e1 = new Array(1024).fill(0.1);
    const e2 = new Array(1024).fill(0.2);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [{ embedding: e1 }, { embedding: e2 }] }),
      text: () => Promise.resolve(""),
    });

    const result = await new JinaProvider().embedBatch(["a", "b"], "query", false);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(e1);
    expect(result[1]).toEqual(e2);
  });

  it("embedBatch throws on non-2xx response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    });
    await expect(new JinaProvider().embedBatch(["hello"], "document", true)).rejects.toThrow(
      "Jina API error 429",
    );
  });

  it("embedBatch throws on empty data array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
      text: () => Promise.resolve(""),
    });
    await expect(new JinaProvider().embedBatch(["hello"], "document", true)).rejects.toThrow(
      "empty embeddings",
    );
  });
});
