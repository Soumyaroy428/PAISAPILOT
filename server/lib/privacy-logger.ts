/**
 * Privacy-Safe Logger & Sensitive Data Redactor.
 * Automatically masks personal identifiers (PAN, email, account numbers, card numbers)
 * and eliminates secrets (passwords, tokens, API keys) from server logs.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apiKey/i,
  /authorization/i,
  /cookie/i,
  /jwt/i,
  /pin/i,
];

// Patterns for string-level redaction
const CARD_NUMBER_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]{1,2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
const BANK_ACCOUNT_REGEX = /\b\d{9,18}\b/g;

/**
 * Masks a string containing potentially sensitive financial or personal data.
 */
export function maskSensitiveString(input: string): string {
  if (!input || typeof input !== "string") return input;

  return input
    // Mask 16-digit cards: 1234-****-****-5678
    .replace(CARD_NUMBER_REGEX, (card) => {
      const clean = card.replace(/[-\s]/g, "");
      return `${clean.slice(0, 4)}-****-****-${clean.slice(-4)}`;
    })
    // Mask Indian PAN: ABCDE****F
    .replace(PAN_REGEX, (pan) => `${pan.slice(0, 5)}****${pan.slice(-1)}`)
    // Mask emails: j***@example.com
    .replace(EMAIL_REGEX, (_match, prefix, domain) => `${prefix}***@${domain}`)
    // Mask long account numbers: *******1234
    .replace(BANK_ACCOUNT_REGEX, (acc) => `*******${acc.slice(-4)}`);
}

/**
 * Deeply sanitizes objects, masking values of sensitive keys.
 */
export function sanitizeLogData(data: any, depth = 0): any {
  if (depth > 6) return "[MaxDepthReached]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return maskSensitiveString(data);
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    // If key itself represents a secret, completely redact it
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeLogData(val, depth + 1);
    }
  }

  return sanitized;
}

export const safeLogger = {
  info(message: string, meta?: any): void {
    const sanitizedMeta = meta ? sanitizeLogData(meta) : "";
    console.log(`[INFO] ${maskSensitiveString(message)}`, sanitizedMeta);
  },
  warn(message: string, meta?: any): void {
    const sanitizedMeta = meta ? sanitizeLogData(meta) : "";
    console.warn(`[WARN] ${maskSensitiveString(message)}`, sanitizedMeta);
  },
  error(message: string, meta?: any): void {
    const sanitizedMeta = meta ? sanitizeLogData(meta) : "";
    console.error(`[ERROR] ${maskSensitiveString(message)}`, sanitizedMeta);
  },
};
