import { describe, it, expect } from 'vitest';
import {
  canonicalText,
  buildOffsetMap,
  canonicalToPm,
  pmToCanonical,
  type ProseMirrorDoc,
} from '@/lib/engine/offsets';
import { computeFingerprint } from '@/lib/engine/fingerprint';
import { runDeterministicRules } from '@/lib/engine/checker';
import { resolveRules } from '@/lib/engine/resolve';
import type { Rule, RuleOverride, Channel, ResolvedRule } from '@/lib/engine/types';

describe('Engine: Text Normalization and Offsets', () => {
  it('extracts canonical text from ProseMirror document structure', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph.' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph.' }],
        },
      ],
    };

    const text = canonicalText(doc);
    expect(text).toBe('First paragraph.\nSecond paragraph.');

    const offsetMap = buildOffsetMap(doc);
    expect(offsetMap.length).toBe(2);

    // Map offset in canonical text to ProseMirror position
    const pmPos = canonicalToPm(0, offsetMap);
    expect(pmPos).toBe(1);

    const backToCanon = pmToCanonical(pmPos, offsetMap);
    expect(backToCanon).toBe(0);
  });
});

describe('Engine: Fingerprinting', () => {
  it('generates consistent hash for same rule, quote, and occurrence', () => {
    const fp1 = computeFingerprint('rule-1', 'unhackable', 0);
    const fp2 = computeFingerprint('rule-1', 'unhackable', 0);
    expect(fp1).toBe(fp2);
    expect(typeof fp1).toBe('string');
  });

  it('generates distinct hash for different quotes, rules, or occurrences', () => {
    const fp1 = computeFingerprint('rule-1', 'unhackable', 0);
    const fp2 = computeFingerprint('rule-2', 'unhackable', 0);
    const fp3 = computeFingerprint('rule-1', '100% bug-free', 0);
    const fp4 = computeFingerprint('rule-1', 'unhackable', 1);

    expect(fp1).not.toBe(fp2);
    expect(fp1).not.toBe(fp3);
    expect(fp1).not.toBe(fp4);
  });
});

describe('Engine: Deterministic Rule Checking', () => {
  const dummyResolvedRules: ResolvedRule[] = [
    {
      rule: {
        id: 'rule-regex-1',
        orgId: 'org-1',
        key: 'no-unsubstantiated-claims',
        name: 'No Unsubstantiated Security Claims',
        description: 'Do not claim 100% bug-free or unhackable',
        type: 'regex',
        config: {
          pattern: 'unhackable|100% bug-free',
          flags: 'gi',
          suggest: 'enterprise-grade and secure',
          message: 'Security claims must be verifiable',
        },
        baseSeverity: 'hard',
        dos: ['Say enterprise-grade'],
        donts: ['Do not say unhackable'],
        exceptions: [],
      },
      effectiveSeverity: 'hard',
      effectiveConfig: {
        pattern: 'unhackable|100% bug-free',
        flags: 'gi',
        suggest: 'enterprise-grade and secure',
        message: 'Security claims must be verifiable',
      },
    },
    {
      rule: {
        id: 'rule-term-1',
        orgId: 'org-1',
        key: 'antigravity-terminology',
        name: 'Brand Terminology',
        description: 'Proper brand casing',
        type: 'term_map',
        config: {
          entries: [
            { match: 'anti-gravity', suggest: ['Antigravity'] },
          ],
          caseSensitive: false,
          wholeWord: true,
        },
        baseSeverity: 'soft',
        dos: ['Antigravity'],
        donts: ['anti-gravity'],
        exceptions: [],
      },
      effectiveSeverity: 'soft',
      effectiveConfig: {
        entries: [
          { match: 'anti-gravity', suggest: ['Antigravity'] },
        ],
        caseSensitive: false,
        wholeWord: true,
      },
    },
    {
      rule: {
        id: 'rule-emoji-1',
        orgId: 'org-1',
        key: 'emoji-cap',
        name: 'Emoji Cap',
        description: 'Maximum 1 emoji allowed',
        type: 'emoji_limit',
        config: { max: 1 },
        baseSeverity: 'soft',
        dos: [],
        donts: [],
        exceptions: [],
      },
      effectiveSeverity: 'soft',
      effectiveConfig: { max: 1 },
    },
  ];

  it('detects regex pattern violations and produces accurate replacement', () => {
    const text = 'Our new platform is completely unhackable and guaranteed to work.';
    const flags = runDeterministicRules(text, dummyResolvedRules);

    const regexFlag = flags.find((f) => f.ruleId === 'rule-regex-1');
    expect(regexFlag).toBeDefined();
    expect(regexFlag?.quote.toLowerCase()).toBe('unhackable');
    expect(regexFlag?.severity).toBe('hard');
    expect(regexFlag?.suggestions[0]?.replacement).toBe('enterprise-grade and secure');
  });

  it('detects plain-text term map violations', () => {
    const text = 'Exploring the wonders of anti-gravity engines.';
    const flags = runDeterministicRules(text, dummyResolvedRules);

    const termFlag = flags.find((f) => f.ruleId === 'rule-term-1');
    expect(termFlag).toBeDefined();
    expect(termFlag?.quote.toLowerCase()).toBe('anti-gravity');
    expect(termFlag?.severity).toBe('soft');
  });

  it('detects emoji limit exceedance', () => {
    const text = 'Exciting news! 🚀🎉';
    const flags = runDeterministicRules(text, dummyResolvedRules);

    const emojiFlags = flags.filter((f) => f.ruleId === 'rule-emoji-1');
    expect(emojiFlags.length).toBe(1);
    expect(emojiFlags[0].quote).toBe('🎉');
  });

  it('returns empty array when text has zero violations', () => {
    const text = 'Our secure, enterprise-grade cloud workspace delivers high performance.';
    const flags = runDeterministicRules(text, dummyResolvedRules);
    expect(flags.length).toBe(0);
  });
});

describe('Engine: Channel Rule Resolution', () => {
  const baseRules: Rule[] = [
    {
      id: 'r1',
      orgId: 'org-1',
      key: 'colloquialisms',
      name: 'Colloquialisms',
      description: 'No slang',
      type: 'regex',
      config: { pattern: 'gonna|wanna', suggest: 'going to' },
      baseSeverity: 'hard',
      dos: [],
      donts: [],
      exceptions: [],
    },
  ];

  const channel: Channel = {
    id: 'ch-social',
    orgId: 'org-1',
    slug: 'twitter-x',
    name: 'Twitter / X',
    mode: 'flexible',
    formality: 3,
    llmThreshold: 0.8,
    description: 'Social channel',
  };

  it('overrides rule severity when channel override is present', () => {
    const overrides: RuleOverride[] = [
      {
        id: 'ov-1',
        orgId: 'org-1',
        ruleId: 'r1',
        channelId: 'ch-social',
        severity: 'soft',
        configPatch: {},
      },
    ];

    const resolved = resolveRules(baseRules, overrides, channel);
    expect(resolved.length).toBe(1);
    expect(resolved[0].effectiveSeverity).toBe('soft');
  });

  it('skips rule completely if override severity is "off"', () => {
    const overrides: RuleOverride[] = [
      {
        id: 'ov-1',
        orgId: 'org-1',
        ruleId: 'r1',
        channelId: 'ch-social',
        severity: 'off',
        configPatch: {},
      },
    ];

    const resolved = resolveRules(baseRules, overrides, channel);
    expect(resolved.length).toBe(0);
  });
});
