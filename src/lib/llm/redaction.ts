// Text redaction for AI pass — preserves exact text length using █ characters
// Redacts emails, phone numbers, card-like digit runs, and confidential terms

/**
 * Redact sensitive information from text, replacing with █ characters
 * of the same length so offsets never shift.
 */
export function redactText(
  text: string,
  confidentialTerms: string[] = []
): string {
  let result = text;

  // Redact emails
  result = replacePreservingLength(result, /[\w.+-]+@[\w-]+\.[\w.-]+/g);

  // Redact phone numbers (various formats)
  result = replacePreservingLength(result, /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g);

  // Redact card-number-like digit runs (4+ digit groups)
  result = replacePreservingLength(result, /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g);

  // Redact confidential terms (case-insensitive)
  for (const term of confidentialTerms) {
    if (!term) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    result = replacePreservingLength(result, regex);
  }

  return result;
}

/**
 * Replace all matches of a regex with █ characters of the same length.
 */
function replacePreservingLength(text: string, regex: RegExp): string {
  return text.replace(regex, (match) => '█'.repeat(match.length));
}

/**
 * Check if redaction preserved length exactly.
 * Used in tests.
 */
export function validateRedactionLength(original: string, redacted: string): boolean {
  return original.length === redacted.length;
}
