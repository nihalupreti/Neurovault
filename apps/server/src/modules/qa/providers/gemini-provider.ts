import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, LLMProvider } from "./types.js";

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(model: string) {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = model;
  }

  chatStream(params: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string> {
    const systemMsg = params.messages.find((m) => m.role === "system");
    const chatMessages = params.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const tokens: string[] = [];
    let notify: (() => void) | null = null;
    let done = false;
    let streamError: Error | null = null;

    // Consume SDK stream in an isolated async context to avoid
    // nested async-generator deadlock in CJS bundles
    this.client.models
      .generateContentStream({
        model: this.model,
        contents: chatMessages,
        config: {
          systemInstruction: systemMsg?.content,
          temperature: params.temperature ?? 0.3,
          maxOutputTokens: params.maxTokens ?? 2048,
        },
      })
      .then(async (stream) => {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            tokens.push(text);
            notify?.();
            notify = null;
          }
        }
      })
      .catch((err: unknown) => {
        streamError = err instanceof Error ? err : new Error(String(err));
      })
      .finally(() => {
        done = true;
        notify?.();
        notify = null;
      });

    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<string>> {
            while (tokens.length === 0 && !done && !streamError) {
              await new Promise<void>((r) => {
                notify = r;
              });
            }
            if (tokens.length > 0) return { value: tokens.shift()!, done: false };
            if (streamError) throw streamError;
            return { value: undefined as unknown as string, done: true };
          },
        };
      },
    };
  }
}
