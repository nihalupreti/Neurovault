export interface ArticleInput {
  source: string;
  title: string;
  content: string;
  captured: string;
}

export interface BookmarkInput {
  source: string;
  title: string;
  description: string;
  captured: string;
}

export function formatArticleNote(input: ArticleInput): string {
  const lines = [
    "---",
    `source: ${input.source}`,
    `title: "${input.title}"`,
    `captured: ${input.captured}`,
    "type: article",
    "---",
    "",
    `# ${input.title}`,
    "",
    input.content,
  ];
  return lines.join("\n");
}

export function formatBookmarkNote(input: BookmarkInput): string {
  const lines = [
    "---",
    `source: ${input.source}`,
    `title: "${input.title}"`,
    `captured: ${input.captured}`,
    "type: bookmark",
    "---",
    "",
    `# ${input.title}`,
    "",
    `[Source](${input.source})`,
  ];

  if (input.description) {
    lines.push("", `> ${input.description}`);
  }

  return lines.join("\n");
}

export function formatRawNote(text: string): string {
  return text;
}

export function generateFilename(title: string): string {
  if (!title.trim()) {
    return `capture-${Date.now()}.md`;
  }

  const sanitized = title
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 50)
    .trimEnd();

  return `${sanitized}.md`;
}
