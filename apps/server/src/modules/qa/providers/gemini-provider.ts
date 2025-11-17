import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, LLMProvider } from "./types.js";

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(model: string) {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = model;
  }

  async *chatStream(params: {
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

    const stream = await this.client.models.generateContentStream({
      model: this.model,
      contents: chatMessages,
      config: {
        systemInstruction: systemMsg?.content,
        temperature: params.temperature ?? 0.3,
        maxOutputTokens: params.maxTokens ?? 2048,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
