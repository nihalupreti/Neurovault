import { createHash } from "crypto";

export type NodeType = "root" | "section" | "paragraph" | "code" | "list" | "blockquote" | "table";

export interface ContentNode {
  type: NodeType;
  heading?: string;
  headingLevel?: number;
  content: string;
  children: ContentNode[];
  metadata?: Record<string, string>;
}

export interface ContentParser {
  parse(content: string, metadata?: Record<string, string>): ContentNode;
}

export interface SectionBlock {
  headingPath: string[];
  content: string;
  metadata?: Record<string, string>;
}

export interface PreparedChunk {
  text: string;
  headingPath: string[];
  sectionContent: string;
  chunkIndex: number;
  contentHash: string;
  metadata?: Record<string, string>;
}

export interface ChunkBatch {
  chunks: PreparedChunk[];
  totalTokenEstimate: number;
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

export function sectionId(headingPath: string[]): string {
  return createHash("sha256").update(headingPath.join("/"), "utf-8").digest("hex");
}
