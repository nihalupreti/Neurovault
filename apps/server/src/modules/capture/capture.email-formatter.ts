export interface EmailNoteInput {
  from: string;
  subject: string;
  date: string;
  body: string;
  attachments: string[];
}

export function formatEmailNote(input: EmailNoteInput): string {
  const title = input.subject.trim() || `Email from ${input.from}`;
  const dateShort = input.date.slice(0, 10);
  const captured = new Date().toISOString();

  const frontmatter = [
    "---",
    "source: email",
    `from: "${input.from}"`,
    `subject: "${title}"`,
    `date: ${input.date}`,
    `captured: ${captured}`,
    "type: email",
  ];

  if (input.attachments.length > 0) {
    frontmatter.push("attachments:");
    for (const att of input.attachments) {
      frontmatter.push(`  - "${att}"`);
    }
  }

  frontmatter.push("---");

  const body = [
    "",
    `# ${title}`,
    "",
    `> Forwarded from ${input.from} on ${dateShort}`,
    "",
    input.body,
  ];

  if (input.attachments.length > 0) {
    body.push("", "## Attachments", "");
    for (const att of input.attachments) {
      body.push(`- [[${att}]]`);
    }
  }

  return [...frontmatter, ...body].join("\n");
}
