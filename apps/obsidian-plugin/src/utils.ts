export function toBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

export function fromBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf-8");
}

export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function matchGlob(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${regex}$`).test(path);
}

export function matchesGlobs(
  path: string,
  include: string[],
  exclude: string[]
): boolean {
  const included =
    include.length === 0 || include.some((p) => matchGlob(path, p));
  const excluded = exclude.some((p) => matchGlob(path, p));
  return included && !excluded;
}
