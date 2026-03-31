export interface ParsedQuery {
  file?: string;
  semantic?: string;
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const hasPrefix = /![\w]+:/.test(trimmed);
  if (!hasPrefix) {
    return { semantic: trimmed };
  }

  const result: ParsedQuery = {};
  const prefixRegex = /!([\w]+):/g;
  const matches: { prefix: string; start: number; valueStart: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = prefixRegex.exec(trimmed)) !== null) {
    matches.push({
      prefix: `!${match[1]}:`,
      start: match.index,
      valueStart: match.index + match[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i]!;
    const nextStart = matches[i + 1]?.start ?? trimmed.length;
    const value = trimmed.slice(curr.valueStart, nextStart).trim();

    if (curr.prefix === "!file:" && value) {
      result.file = value;
    } else if (curr.prefix === "!semantic:" && value) {
      result.semantic = value;
    }
  }

  return result;
}
