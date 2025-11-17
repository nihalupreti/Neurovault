import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContentStream = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContentStream: mockGenerateContentStream };
  },
}));

import { GeminiProvider } from "../providers/gemini-provider.js";

describe("GeminiProvider", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockGenerateContentStream.mockReset();
  });

  it("yields tokens from stream chunks", async () => {
    mockGenerateContentStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { text: () => "Hello" };
        yield { text: () => " world" };
      },
    });

    const provider = new GeminiProvider("gemini-2.0-flash");
    const tokens: string[] = [];

    for await (const token of provider.chatStream({
      messages: [{ role: "user", content: "test" }],
    })) {
      tokens.push(token);
    }

    expect(tokens).toEqual(["Hello", " world"]);
  });

  it("passes model and messages to SDK", async () => {
    mockGenerateContentStream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { text: () => "ok" };
      },
    });

    const provider = new GeminiProvider("gemini-2.0-flash");
    const messages = [
      { role: "system" as const, content: "You are helpful." },
      { role: "user" as const, content: "Hi" },
    ];

    for await (const _ of provider.chatStream({ messages })) {
      // consume
    }

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
        config: expect.objectContaining({
          systemInstruction: "You are helpful.",
        }),
      })
    );
  });
});
