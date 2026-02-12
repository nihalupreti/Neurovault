import type { ContentNode, SectionBlock, PreparedChunk } from "./parsers/parser.types.js";
import { contentHash } from "./parsers/parser.types.js";

const DEFAULT_MAX_CHUNK_CHARS = 2000;

export function flattenSections(tree: ContentNode): SectionBlock[] {
  const sections: SectionBlock[] = [];
  walkNode(tree, [], tree.metadata, sections);
  return sections;
}

function walkNode(
  node: ContentNode,
  headingPath: string[],
  rootMetadata: Record<string, string> | undefined,
  out: SectionBlock[]
): void {
  if (node.type === "root") {
    const contentChildren: ContentNode[] = [];
    for (const child of node.children) {
      if (child.type === "section") {
        if (contentChildren.length > 0) {
          out.push(buildSectionBlock([], contentChildren, rootMetadata));
          contentChildren.length = 0;
        }
        walkNode(child, [], rootMetadata, out);
      } else {
        contentChildren.push(child);
      }
    }
    if (contentChildren.length > 0) {
      out.push(buildSectionBlock([], contentChildren, rootMetadata));
    }
    return;
  }

  if (node.type === "section") {
    const currentPath = node.heading ? [...headingPath, node.heading] : headingPath;
    const contentChildren: ContentNode[] = [];

    for (const child of node.children) {
      if (child.type === "section") {
        if (contentChildren.length > 0) {
          out.push(buildSectionBlock(currentPath, contentChildren, rootMetadata));
          contentChildren.length = 0;
        }
        walkNode(child, currentPath, rootMetadata, out);
      } else {
        contentChildren.push(child);
      }
    }

    if (contentChildren.length > 0) {
      out.push(buildSectionBlock(currentPath, contentChildren, rootMetadata));
    }
  }
}

function buildSectionBlock(
  headingPath: string[],
  children: ContentNode[],
  metadata: Record<string, string> | undefined
): SectionBlock {
  const content = children.map((c) => c.content).join("\n\n");
  return { headingPath, content, metadata };
}

export function splitSectionIntoChunks(
  section: SectionBlock,
  startIndex: number,
  maxChars = DEFAULT_MAX_CHUNK_CHARS
): PreparedChunk[] {
  const text = section.content.trim();
  if (!text) return [];

  const sentences = splitSentences(text);
  const chunks: PreparedChunk[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const sentence of sentences) {
    const sentenceLen = sentence.length;

    if (currentLen + sentenceLen > maxChars && current.length > 0) {
      const chunkText = current.join(" ");
      chunks.push(makeChunk(chunkText, section, startIndex + chunks.length));
      current = [];
      currentLen = 0;
    }

    current.push(sentence);
    currentLen += sentenceLen + 1;
  }

  if (current.length > 0) {
    const chunkText = current.join(" ");
    chunks.push(makeChunk(chunkText, section, startIndex + chunks.length));
  }

  return chunks;
}

function makeChunk(text: string, section: SectionBlock, index: number): PreparedChunk {
  return {
    text,
    headingPath: section.headingPath,
    sectionContent: section.content,
    chunkIndex: index,
    contentHash: contentHash(text),
    metadata: section.metadata,
  };
}

function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=\.)\s+/);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}
