import type { WikiLink } from "./types.js";

export function parseWikilinks(markdown: string): WikiLink[] {
  if (!markdown) return [];

  const stripped = stripCodeBlocks(markdown);
  const links: WikiLink[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(stripped)) !== null) {
    const inner = match[1]!;
    const pipeIndex = inner.indexOf("|");

    if (pipeIndex === -1) {
      links.push({ target: inner, alias: undefined, position: match.index });
    } else {
      links.push({
        target: inner.slice(0, pipeIndex),
        alias: inner.slice(pipeIndex + 1),
        position: match.index,
      });
    }
  }

  return links;
}

function stripCodeBlocks(markdown: string): string {
  let result = markdown.replace(/```[\s\S]*?```/g, (match) =>
    " ".repeat(match.length)
  );
  result = result.replace(/`[^`]+`/g, (match) => " ".repeat(match.length));
  return result;
}
