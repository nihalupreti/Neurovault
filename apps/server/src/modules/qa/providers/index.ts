import type { LLMProvider } from "./types.js";
import { GeminiProvider } from "./gemini-provider.js";
import { OpenAICompatibleProvider } from "./openai-provider.js";

export function createProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "gemini";
  const model = process.env.LLM_MODEL || "gemini-2.0-flash";

  switch (provider) {
    case "gemini":
      return new GeminiProvider(model);

    case "openai-compatible": {
      const apiKey = process.env.LLM_API_KEY;
      if (!apiKey) {
        throw new Error(
          "LLM_API_KEY required for openai-compatible provider"
        );
      }
      return new OpenAICompatibleProvider({
        apiKey,
        baseURL: process.env.LLM_BASE_URL,
        model,
      });
    }

    default:
      throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
  }
}

export type { LLMProvider, ChatMessage, Citation, RetrievedChunk } from "./types.js";
