import OpenAI from "openai";
import type { ChatMessage, LLMProvider } from "./types.js";

interface OpenAIProviderConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model;
  }

  chatStream(params: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string> {
    const tokens: string[] = [];
    let notify: (() => void) | null = null;
    let done = false;
    let streamError: Error | null = null;

    // Consume SDK stream in an isolated async context to avoid
    // nested async-generator deadlock in CJS bundles
    this.client.chat.completions
      .create({
        model: this.model,
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 2048,
      })
      .then(async (stream) => {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            tokens.push(content);
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
