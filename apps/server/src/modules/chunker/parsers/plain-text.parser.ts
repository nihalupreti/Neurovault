import type { ContentNode, ContentParser } from "./parser.types.js";

export class PlainTextParser implements ContentParser {
  parse(content: string, metadata?: Record<string, string>): ContentNode {
    const paragraphs = content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return {
      type: "root",
      content: "",
      children: paragraphs.map((text) => ({
        type: "paragraph" as const,
        content: text,
        children: [],
      })),
      metadata,
    };
  }
}
