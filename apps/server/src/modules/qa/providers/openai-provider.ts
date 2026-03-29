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

  async *chatStream(params: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 2048,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
