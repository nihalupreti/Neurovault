import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));

import { OpenAICompatibleProvider } from "../providers/openai-provider.js";

describe("OpenAICompatibleProvider", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("yields tokens from streamed deltas", async () => {
    mockCreate.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " world" } }] };
        yield { choices: [{ delta: { content: null } }] };
      },
    });

    const provider = new OpenAICompatibleProvider({
      apiKey: "test-key",
      baseURL: "http://localhost:11434/v1",
      model: "llama3",
    });

    const tokens: string[] = [];
    for await (const token of provider.chatStream({
      messages: [{ role: "user", content: "test" }],
    })) {
      tokens.push(token);
    }

    expect(tokens).toEqual(["Hello", " world"]);
  });

  it("passes messages and config to SDK", async () => {
    mockCreate.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "ok" } }] };
      },
    });

    const provider = new OpenAICompatibleProvider({
      apiKey: "test-key",
      baseURL: "http://localhost:1234/v1",
      model: "gpt-4o-mini",
    });

    const messages = [
      { role: "system" as const, content: "Be helpful" },
      { role: "user" as const, content: "Hi" },
    ];

    for await (const _ of provider.chatStream({
      messages,
      temperature: 0.5,
      maxTokens: 1024,
    })) {
      // consume
    }

    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Hi" },
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 1024,
    });
  });
});
