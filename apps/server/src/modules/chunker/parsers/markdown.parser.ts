import type { ContentNode, ContentParser } from "./parser.types.js";

export class MarkdownParser implements ContentParser {
  parse(content: string, metadata?: Record<string, string>): ContentNode {
    const root: ContentNode = { type: "root", content: "", children: [], metadata };
    if (!content.trim()) return root;

    const blocks = this.splitBlocks(content);
    const sectionStack: { node: ContentNode; level: number }[] = [{ node: root, level: 0 }];

    for (const block of blocks) {
      const headingMatch = block.match(/^(#{1,6})\s+(.+)$/m);

      if (headingMatch && !this.isCodeFenceBlock(block)) {
        const level = headingMatch[1]!.length;
        const heading = headingMatch[2]!.trim();

        const sectionNode: ContentNode = {
          type: "section",
          heading,
          headingLevel: level,
          content: "",
          children: [],
        };

        while (sectionStack.length > 1 && sectionStack[sectionStack.length - 1]!.level >= level) {
          sectionStack.pop();
        }

        sectionStack[sectionStack.length - 1]!.node.children.push(sectionNode);
        sectionStack.push({ node: sectionNode, level });
      } else {
        const node = this.classifyBlock(block);
        sectionStack[sectionStack.length - 1]!.node.children.push(node);
      }
    }

    return root;
  }

  private splitBlocks(content: string): string[] {
    const blocks: string[] = [];
    const lines = content.split("\n");
    let current: string[] = [];
    let inCodeFence = false;

    for (const line of lines) {
      if (line.trimStart().startsWith("```")) {
        if (inCodeFence) {
          current.push(line);
          blocks.push(current.join("\n"));
          current = [];
          inCodeFence = false;
        } else {
          if (current.length > 0) {
            blocks.push(current.join("\n"));
            current = [];
          }
          current.push(line);
          inCodeFence = true;
        }
        continue;
      }

      if (inCodeFence) {
        current.push(line);
        continue;
      }

      if (line.trim() === "") {
        if (current.length > 0) {
          blocks.push(current.join("\n"));
          current = [];
        }
      } else {
        current.push(line);
      }
    }

    if (current.length > 0) {
      blocks.push(current.join("\n"));
    }

    return blocks.filter((b) => b.trim().length > 0);
  }

  private isCodeFenceBlock(block: string): boolean {
    return block.trimStart().startsWith("```");
  }

  private classifyBlock(block: string): ContentNode {
    const trimmed = block.trim();

    if (trimmed.startsWith("```")) {
      const content = trimmed.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
      return { type: "code", content, children: [] };
    }

    if (trimmed.startsWith("> ")) {
      const content = trimmed.replace(/^>\s?/gm, "");
      return { type: "blockquote", content, children: [] };
    }

    if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      return { type: "list", content: trimmed, children: [] };
    }

    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      return { type: "table", content: trimmed, children: [] };
    }

    return { type: "paragraph", content: trimmed, children: [] };
  }
}
