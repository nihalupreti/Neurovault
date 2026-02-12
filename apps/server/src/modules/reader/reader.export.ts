interface AnnotationForExport {
  type: string;
  sectionTitle: string;
  highlightedText: string;
  noteContent: string | null;
  linkedNoteName: string | null;
}

interface ChapterAnnotations {
  chapterNumber: number;
  chapterTitle: string;
  annotations: AnnotationForExport[];
}

export function generateObsidianMarkdown(bookTitle: string, chapters: ChapterAnnotations[]): string {
  const lines: string[] = [`# Reading Notes: ${bookTitle}`, ""];

  for (const ch of chapters) {
    if (ch.annotations.length === 0) continue;
    lines.push(`## Chapter ${ch.chapterNumber}: ${ch.chapterTitle}`, "");

    const highlights = ch.annotations.filter((a) => a.type === "highlight" || a.type === "note");
    const vaultLinks = ch.annotations.filter((a) => a.type === "vault-link");

    if (highlights.length > 0) {
      lines.push("### Highlights", "");
      for (const a of highlights) {
        let line = `- "${a.highlightedText}" *(Section: ${a.sectionTitle})*`;
        if (a.noteContent) line += `\n  - ${a.noteContent}`;
        if (a.linkedNoteName) line += ` → [[${a.linkedNoteName}]]`;
        lines.push(line);
      }
      lines.push("");
    }

    if (vaultLinks.length > 0) {
      lines.push("### Vault Links", "");
      for (const a of vaultLinks) {
        lines.push(`- Section "${a.sectionTitle}" ↔ [[${a.linkedNoteName}]]`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
