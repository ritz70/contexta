// Deterministic rule engine — pure TypeScript, no I/O
// Runs all non-LLM rule types against canonical text

import type {
  ResolvedRule,
  EngineFlag,
  FlagSuggestion,
  TermMapConfig,
  RequiredPhraseConfig,
  RegexConfig,
  MaxLengthConfig,
  EmojiLimitConfig,
  ExclamationLimitConfig,
} from './types';
import { computeFingerprint } from './fingerprint';

/**
 * Run all deterministic rules against the canonical text.
 * Returns an array of flags (not yet reconciled with DB).
 */
export function runDeterministicRules(
  text: string,
  resolvedRules: ResolvedRule[]
): EngineFlag[] {
  const flags: EngineFlag[] = [];

  for (const resolved of resolvedRules) {
    if (resolved.rule.type === 'llm') continue; // LLM rules are not run deterministically

    const ruleFlags = runSingleRule(text, resolved);
    flags.push(...ruleFlags);
  }

  return flags;
}

function runSingleRule(text: string, resolved: ResolvedRule): EngineFlag[] {
  const { rule, effectiveSeverity, effectiveConfig } = resolved;

  switch (rule.type) {
    case 'term_map':
      return runTermMap(text, rule.id, rule.name, effectiveSeverity, effectiveConfig as TermMapConfig, rule.exceptions);
    case 'required_phrase':
      return runRequiredPhrase(text, rule.id, rule.name, effectiveSeverity, effectiveConfig as RequiredPhraseConfig);
    case 'regex':
      return runRegex(text, rule.id, rule.name, effectiveSeverity, effectiveConfig as RegexConfig);
    case 'max_length':
      return runMaxLength(text, rule.id, rule.name, effectiveSeverity, effectiveConfig as MaxLengthConfig);
    case 'emoji_limit':
      return runEmojiLimit(text, rule.id, rule.name, effectiveSeverity, effectiveConfig as EmojiLimitConfig);
    case 'exclamation_limit':
      return runExclamationLimit(text, rule.id, rule.name, effectiveSeverity, effectiveConfig as ExclamationLimitConfig);
    default:
      return [];
  }
}

// ============================================================
// Term Map
// ============================================================

function runTermMap(
  text: string,
  ruleId: string,
  ruleName: string,
  severity: 'hard' | 'soft',
  config: TermMapConfig,
  exceptions: string[]
): EngineFlag[] {
  const flags: EngineFlag[] = [];
  const occurrenceCount = new Map<string, number>();

  for (const entry of config.entries) {
    const matches = findTermMatches(text, entry.match, config.caseSensitive ?? false, config.wholeWord ?? false);

    for (const match of matches) {
      // Check if the match falls within an exception phrase
      if (isInException(text, match.start, match.end, exceptions, config.caseSensitive ?? false)) {
        continue;
      }

      const normalizedKey = entry.match.toLowerCase();
      const count = occurrenceCount.get(normalizedKey) ?? 0;
      occurrenceCount.set(normalizedKey, count + 1);

      const quote = text.slice(match.start, match.end);
      const suggestions = buildTermSuggestions(quote, entry.suggest);

      const explanation = entry.suggest.length > 0
        ? `"${quote}" should be replaced with ${entry.suggest.map(s => `"${s}"`).join(' or ')}`
        : `"${quote}" is not allowed in this context`;

      flags.push({
        ruleId,
        source: 'deterministic',
        category: ruleName,
        severity,
        scope: 'span',
        start: match.start,
        end: match.end,
        quote,
        explanation,
        suggestions,
        confidence: 1,
        fingerprint: computeFingerprint(ruleId, quote, count),
      });
    }
  }

  return flags;
}

function findTermMatches(
  text: string,
  term: string,
  caseSensitive: boolean,
  wholeWord: boolean
): Array<{ start: number; end: number }> {
  const matches: Array<{ start: number; end: number }> = [];
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchTerm = caseSensitive ? term : term.toLowerCase();

  let pos = 0;
  while (pos < searchText.length) {
    const idx = searchText.indexOf(searchTerm, pos);
    if (idx === -1) break;

    const end = idx + searchTerm.length;

    if (wholeWord) {
      const charBefore = idx > 0 ? searchText[idx - 1] : ' ';
      const charAfter = end < searchText.length ? searchText[end] : ' ';
      if (isWordChar(charBefore) || isWordChar(charAfter)) {
        pos = idx + 1;
        continue;
      }
    }

    matches.push({ start: idx, end });
    pos = end;
  }

  return matches;
}

function isWordChar(ch: string): boolean {
  return /\w/.test(ch);
}

function isInException(
  text: string,
  matchStart: number,
  matchEnd: number,
  exceptions: string[],
  caseSensitive: boolean
): boolean {
  for (const exception of exceptions) {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchException = caseSensitive ? exception : exception.toLowerCase();
    let pos = 0;
    while (pos < searchText.length) {
      const idx = searchText.indexOf(searchException, pos);
      if (idx === -1) break;
      const exEnd = idx + searchException.length;
      // Match is within exception if it's fully contained
      if (matchStart >= idx && matchEnd <= exEnd) {
        return true;
      }
      pos = idx + 1;
    }
  }
  return false;
}

function buildTermSuggestions(quote: string, suggests: string[]): FlagSuggestion[] {
  if (suggests.length === 0) {
    return [{ label: 'Remove this term', replacement: '' }];
  }
  return suggests.map((s) => {
    // Preserve capitalisation of the matched term's first letter
    const adjusted = preserveCase(quote, s);
    return { label: `Replace with "${adjusted}"`, replacement: adjusted };
  });
}

function preserveCase(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// ============================================================
// Required Phrase
// ============================================================

function runRequiredPhrase(
  text: string,
  ruleId: string,
  ruleName: string,
  severity: 'hard' | 'soft',
  config: RequiredPhraseConfig
): EngineFlag[] {
  const searchText = config.caseSensitive ? text : text.toLowerCase();
  const found = config.anyOf.some((phrase) => {
    const searchPhrase = config.caseSensitive ? phrase : phrase.toLowerCase();
    return searchText.includes(searchPhrase);
  });

  if (found) return [];

  const suggestions: FlagSuggestion[] = [];
  if (config.insertText) {
    suggestions.push({ label: 'Insert required disclosure', insertText: config.insertText });
  }

  return [{
    ruleId,
    source: 'deterministic',
    category: ruleName,
    severity,
    scope: 'document',
    start: 0,
    end: 0,
    quote: '',
    explanation: `Document must contain one of: ${config.anyOf.map(p => `"${p}"`).join(', ')}`,
    suggestions,
    confidence: 1,
    fingerprint: computeFingerprint(ruleId, '__document_level__', 0),
  }];
}

// ============================================================
// Regex
// ============================================================

function runRegex(
  text: string,
  ruleId: string,
  ruleName: string,
  severity: 'hard' | 'soft',
  config: RegexConfig
): EngineFlag[] {
  const flags: EngineFlag[] = [];
  let occurrenceIndex = 0;

  try {
    const regex = new RegExp(config.pattern, config.flags || 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const quote = match[0];
      const suggestions: FlagSuggestion[] = [];
      if (config.suggest) {
        suggestions.push({ label: `Replace with "${config.suggest}"`, replacement: config.suggest });
      }

      flags.push({
        ruleId,
        source: 'deterministic',
        category: ruleName,
        severity,
        scope: 'span',
        start: match.index,
        end: match.index + quote.length,
        quote,
        explanation: config.message || `Matches pattern: ${config.pattern}`,
        suggestions,
        confidence: 1,
        fingerprint: computeFingerprint(ruleId, quote, occurrenceIndex),
      });
      occurrenceIndex++;

      // Prevent infinite loops on zero-length matches
      if (match[0].length === 0) regex.lastIndex++;
    }
  } catch {
    // Invalid regex: skip silently
  }

  return flags;
}

// ============================================================
// Max Length
// ============================================================

function runMaxLength(
  text: string,
  ruleId: string,
  ruleName: string,
  severity: 'hard' | 'soft',
  config: MaxLengthConfig
): EngineFlag[] {
  if (text.length <= config.max_chars) return [];

  const overflowStart = config.max_chars;
  const quote = text.slice(overflowStart, Math.min(overflowStart + 50, text.length));

  return [{
    ruleId,
    source: 'deterministic',
    category: ruleName,
    severity,
    scope: 'span',
    start: overflowStart,
    end: text.length,
    quote,
    explanation: `Content exceeds ${config.max_chars} character limit (${text.length} characters)`,
    suggestions: [{ label: `Trim to ${config.max_chars} characters`, replacement: '' }],
    confidence: 1,
    fingerprint: computeFingerprint(ruleId, '__max_length__', 0),
  }];
}

// ============================================================
// Emoji Limit
// ============================================================

function runEmojiLimit(
  text: string,
  ruleId: string,
  ruleName: string,
  severity: 'hard' | 'soft',
  config: EmojiLimitConfig
): EngineFlag[] {
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const matches: Array<{ start: number; end: number; emoji: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = emojiRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      emoji: match[0],
    });
  }

  if (matches.length <= config.max) return [];

  const excess = matches.slice(config.max);
  return excess.map((m, i) => ({
    ruleId,
    source: 'deterministic' as const,
    category: ruleName,
    severity,
    scope: 'span' as const,
    start: m.start,
    end: m.end,
    quote: m.emoji,
    explanation: `Emoji limit exceeded (${config.max} allowed, ${matches.length} found)`,
    suggestions: [{ label: 'Remove emoji', replacement: '' }],
    confidence: 1,
    fingerprint: computeFingerprint(ruleId, m.emoji, config.max + i),
  }));
}

// ============================================================
// Exclamation Limit
// ============================================================

function runExclamationLimit(
  text: string,
  ruleId: string,
  ruleName: string,
  severity: 'hard' | 'soft',
  config: ExclamationLimitConfig
): EngineFlag[] {
  // Find groups of consecutive exclamation marks
  const groupRegex = /!+/g;
  const groups: Array<{ start: number; end: number; text: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = groupRegex.exec(text)) !== null) {
    groups.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }

  if (groups.length <= config.max) return [];

  const excess = groups.slice(config.max);
  return excess.map((g, i) => ({
    ruleId,
    source: 'deterministic' as const,
    category: ruleName,
    severity,
    scope: 'span' as const,
    start: g.start,
    end: g.end,
    quote: g.text,
    explanation: `Exclamation limit exceeded (${config.max} allowed, ${groups.length} found)`,
    suggestions: [{ label: 'Replace with period', replacement: '.' }],
    confidence: 1,
    fingerprint: computeFingerprint(ruleId, g.text, config.max + i),
  }));
}
