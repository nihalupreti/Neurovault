// apps/server/src/modules/capture/url-validator.ts
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const ALLOWED_SCHEMES = ["http:", "https:"];

const PRIVATE_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];

const PRIVATE_HOSTNAMES = ["localhost", "[::1]"];

export function validateUrl(input: string): ValidationResult {
  if (!input) {
    return { valid: false, reason: "Empty URL" };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { valid: false, reason: "Invalid URL" };
  }

  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    return { valid: false, reason: `Disallowed scheme: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (PRIVATE_HOSTNAMES.includes(hostname)) {
    return { valid: false, reason: "private/reserved address" };
  }

  for (const pattern of PRIVATE_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: "private/reserved address" };
    }
  }

  return { valid: true };
}
