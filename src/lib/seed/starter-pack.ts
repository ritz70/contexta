// Starter pack: channels, rules, overrides, brand profile
// Used by seed AND by "create organization" flow

import type { ChannelMode } from '@/lib/engine/types';

export interface StarterChannel {
  slug: string;
  name: string;
  mode: ChannelMode;
  formality: number;
  llmThreshold: number;
  description: string;
}

export const starterChannels: StarterChannel[] = [
  // Strict
  { slug: 'press-release', name: 'Press Release', mode: 'strict', formality: 5, llmThreshold: 0.45, description: 'Official announcements to media. Precise terminology, hard compliance checks.' },
  { slug: 'legal-disclosure', name: 'Legal Disclosure', mode: 'strict', formality: 5, llmThreshold: 0.45, description: 'Regulatory and legal documents. Every word matters.' },
  { slug: 'whitepaper', name: 'Whitepaper', mode: 'strict', formality: 5, llmThreshold: 0.45, description: 'In-depth research and technical content. Formal, evidence-based.' },
  // Balanced
  { slug: 'blog', name: 'Blog', mode: 'balanced', formality: 3, llmThreshold: 0.60, description: 'Thought leadership and educational content. Brand voice preserved, some flexibility.' },
  { slug: 'website-copy', name: 'Website Copy', mode: 'balanced', formality: 3, llmThreshold: 0.60, description: 'Marketing pages and product descriptions. Clear, on-brand, engaging.' },
  { slug: 'newsletter', name: 'Newsletter', mode: 'balanced', formality: 3, llmThreshold: 0.60, description: 'Email updates to subscribers. Friendly but professional.' },
  // Flexible
  { slug: 'social-post', name: 'Social Post', mode: 'flexible', formality: 1, llmThreshold: 0.75, description: 'Social media content. Casual, engaging, brand-safe.' },
  { slug: 'meme', name: 'Meme', mode: 'flexible', formality: 1, llmThreshold: 0.75, description: 'Humorous visual content captions. Loose, playful, brand-safe.' },
  { slug: 'ad-copy', name: 'Ad Copy', mode: 'flexible', formality: 1, llmThreshold: 0.75, description: 'Advertising text. Punchy, persuasive, compliant.' },
];

export interface StarterRule {
  key: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  baseSeverity: string;
  dos: string[];
  donts: string[];
  exceptions: string[];
}

export const starterRules: StarterRule[] = [
  {
    key: 'no-guarantee-language',
    name: 'No Guarantee Language',
    description: 'Prohibits language that promises guaranteed outcomes, which could mislead customers and violate financial regulations.',
    type: 'term_map',
    config: {
      entries: [
        { match: 'guaranteed returns', suggest: ['potential returns'] },
        { match: 'guaranteed', suggest: ['designed to', 'intended to'] },
        { match: 'we guarantee', suggest: ['we aim to', 'we strive to'] },
        { match: 'risk-free', suggest: ['lower-risk', 'risk-managed'] },
        { match: 'risk free', suggest: ['lower-risk', 'risk-managed'] },
        { match: 'zero risk', suggest: ['managed risk', 'reduced risk'] },
        { match: 'no risk', suggest: ['managed risk', 'lower risk'] },
        { match: "can't lose", suggest: ['designed to protect'] },
        { match: '100% safe', suggest: ['designed with safety in mind'] },
      ],
      caseSensitive: false,
      wholeWord: false,
    },
    baseSeverity: 'hard',
    dos: ['Use qualified language: "may", "designed to", "aims to"', 'Reference specific protections (e.g. FSCS coverage) when relevant'],
    donts: ['Promise absolute outcomes or guarantees', 'Imply zero risk in any financial product'],
    exceptions: [],
  },
  {
    key: 'no-superlatives',
    name: 'No Superlatives',
    description: 'Flags unsubstantiated superlative and absolute claims that cannot be verified.',
    type: 'term_map',
    config: {
      entries: [
        { match: 'best in the world', suggest: ['a leading option'] },
        { match: 'best in the industry', suggest: ['a strong performer'] },
        { match: '#1', suggest: ['a top choice'] },
        { match: 'world-class', suggest: ['high-quality'] },
        { match: 'revolutionary', suggest: ['innovative'] },
        { match: 'unbeatable', suggest: ['competitive'] },
        { match: 'industry-leading', suggest: ['well-regarded'] },
        { match: 'the best', suggest: ['a strong choice', 'an excellent option'] },
      ],
      caseSensitive: false,
      wholeWord: false,
    },
    baseSeverity: 'soft',
    dos: ['Use specific, provable claims with data', 'Describe features rather than making ranking claims'],
    donts: ['Make absolute or comparative claims without evidence', 'Use superlatives that competitors could challenge'],
    exceptions: [],
  },
  {
    key: 'brand-name-casing',
    name: 'Brand Name Casing',
    description: 'Ensures the brand name "NimbusPay" is always written correctly as one word with a capital P.',
    type: 'term_map',
    config: {
      entries: [
        { match: 'Nimbus Pay', suggest: ['NimbusPay'] },
        { match: 'Nimbuspay', suggest: ['NimbusPay'] },
        { match: 'nimbuspay', suggest: ['NimbusPay'] },
        { match: 'NIMBUSPAY', suggest: ['NimbusPay'] },
      ],
      caseSensitive: true,
      wholeWord: false,
    },
    baseSeverity: 'hard',
    dos: ['Always write the brand name as "NimbusPay" (one word, capital N and P)', 'Double-check brand name spelling before publishing'],
    donts: ['Split it into two words or use inconsistent casing', 'Use all-caps or all-lowercase variants'],
    exceptions: [],
  },
  {
    key: 'preferred-customers',
    name: 'Preferred: "Customers"',
    description: 'We call the people who use our products "customers", not "users" or "clients".',
    type: 'term_map',
    config: {
      entries: [
        { match: 'users', suggest: ['customers'] },
        { match: 'clients', suggest: ['customers'] },
      ],
      caseSensitive: false,
      wholeWord: true,
    },
    baseSeverity: 'soft',
    dos: ['Refer to people as "customers" in all customer-facing copy', 'Use "people" as an acceptable alternative in casual contexts'],
    donts: ['Use "users" — it feels impersonal and technical', 'Use "clients" — it sounds overly formal for our brand'],
    exceptions: [],
  },
  {
    key: 'required-risk-disclosure',
    name: 'Risk Disclosure Required',
    description: 'Financial content must include a risk disclosure statement.',
    type: 'required_phrase',
    config: {
      anyOf: ['Capital is at risk', 'Past performance is not a reliable indicator'],
      caseSensitive: false,
      insertText: 'Capital is at risk. Past performance is not a reliable indicator of future results.',
    },
    baseSeverity: 'soft',
    dos: ['Include the risk disclosure in all investment-related content', 'Place it prominently, not buried in small print'],
    donts: ['Omit the disclosure from financial marketing materials', 'Hide it where customers are unlikely to read it'],
    exceptions: [],
  },
  {
    key: 'max-exclamations',
    name: 'Exclamation Limit',
    description: 'Limits the number of exclamation marks to maintain a calm, professional tone.',
    type: 'exclamation_limit',
    config: { max: 1 },
    baseSeverity: 'soft',
    dos: ['Use exclamation marks sparingly for genuine emphasis', 'Prefer confident statements that don\'t need exclamation marks'],
    donts: ['Use multiple exclamation marks in sequence (!!)', 'Overuse exclamation marks — it reduces their impact'],
    exceptions: [],
  },
  {
    key: 'emoji-policy',
    name: 'Emoji Policy',
    description: 'Controls emoji usage per channel to maintain appropriate formality.',
    type: 'emoji_limit',
    config: { max: 0 },
    baseSeverity: 'soft',
    dos: ['Use emoji in casual channels where they add warmth', 'Choose emoji that align with the message sentiment'],
    donts: ['Use emoji in formal or legal content', 'Overuse emoji — one or two well-placed is better than a wall of them'],
    exceptions: [],
  },
  {
    key: 'informal-language',
    name: 'No Informal Language',
    description: 'Flags casual slang and informal expressions that don\'t match our calm, professional voice.',
    type: 'term_map',
    config: {
      entries: [
        { match: 'gonna', suggest: ['going to'] },
        { match: 'wanna', suggest: ['want to'] },
        { match: 'kinda', suggest: ['somewhat', 'rather'] },
        { match: 'stuff', suggest: ['features', 'details', 'things'] },
        { match: 'super excited', suggest: ['pleased', 'delighted'] },
        { match: 'awesome', suggest: ['excellent', 'impressive'] },
        { match: 'heads up', suggest: ['notice', 'reminder'] },
      ],
      caseSensitive: false,
      wholeWord: true,
    },
    baseSeverity: 'soft',
    dos: ['Use clear, professional language that sounds human', 'Match the formality to the channel'],
    donts: ['Use slang in formal or regulatory content', 'Sound robotic — "professional" doesn\'t mean "stiff"'],
    exceptions: [],
  },
  {
    key: 'max-length',
    name: 'Content Length Limit',
    description: 'Enforces character limits for channels with strict length requirements (social, memes, ads).',
    type: 'max_length',
    config: { max_chars: 280 },
    baseSeverity: 'off',
    dos: ['Write concisely and edit ruthlessly for short-form channels', 'Front-load the most important information'],
    donts: ['Exceed the platform character limit', 'Try to cram too many messages into one post'],
    exceptions: [],
  },
  {
    key: 'tone-matches-channel',
    name: 'Tone Matches Channel',
    description: 'AI check: ensures the copy\'s tone and formality match the selected channel.',
    type: 'llm',
    config: { focus: 'tone', instruction: "Copy must match the channel's formality and the brand voice." },
    baseSeverity: 'soft',
    dos: ['Adapt your writing style to the channel\'s formality level', 'Read your draft aloud — does it sound right for the audience?'],
    donts: ['Use the same tone for a legal disclosure and a social post', 'Ignore the channel context when writing'],
    exceptions: [],
  },
  {
    key: 'unsupported-claims',
    name: 'Unsupported Claims',
    description: 'AI check: flags absolute, comparative or unverifiable claims that lack qualification or a source.',
    type: 'llm',
    config: { focus: 'claims', instruction: 'Flag absolute, comparative or unverifiable claims about performance, safety or competitors that lack a qualification or source.' },
    baseSeverity: 'soft',
    dos: ['Back up claims with data, sources or qualifications', 'Use "may", "can", "designed to" instead of absolutes'],
    donts: ['Make unverified comparative claims about competitors', 'State performance figures without context or timeframe'],
    exceptions: [],
  },
  {
    key: 'plain-language',
    name: 'Plain Language',
    description: 'AI check: flags jargon and overly long sentences that reduce clarity.',
    type: 'llm',
    config: { focus: 'clarity', instruction: 'Flag jargon and sentences longer than about 40 words.' },
    baseSeverity: 'soft',
    dos: ['Write sentences under 25 words where possible', 'Explain technical terms on first use'],
    donts: ['Use industry jargon without explanation', 'Write sentences that need to be read twice to understand'],
    exceptions: [],
  },
];

// Override matrix: maps rule key → channel slug → override config
export interface OverrideEntry {
  ruleKey: string;
  channelSlug: string;
  severity: string;
  configPatch?: Record<string, unknown>;
}

export const overrideMatrix: OverrideEntry[] = [
  // no-guarantee-language: hard in all 9
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter','social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'no-guarantee-language', channelSlug: ch, severity: 'hard' })),

  // no-superlatives: hard strict; soft balanced + social + ad; off meme
  ...['press-release','legal-disclosure','whitepaper'].map(ch => ({ ruleKey: 'no-superlatives', channelSlug: ch, severity: 'hard' })),
  ...['blog','website-copy','newsletter','social-post','ad-copy'].map(ch => ({ ruleKey: 'no-superlatives', channelSlug: ch, severity: 'soft' })),
  { ruleKey: 'no-superlatives', channelSlug: 'meme', severity: 'off' },

  // brand-name-casing: hard strict+balanced; soft flexible
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'brand-name-casing', channelSlug: ch, severity: 'hard' })),
  ...['social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'brand-name-casing', channelSlug: ch, severity: 'soft' })),

  // preferred-customers: soft strict+balanced; off flexible
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'preferred-customers', channelSlug: ch, severity: 'soft' })),
  ...['social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'preferred-customers', channelSlug: ch, severity: 'off' })),

  // required-risk-disclosure: hard legal+press; soft whitepaper+ad; off elsewhere
  { ruleKey: 'required-risk-disclosure', channelSlug: 'legal-disclosure', severity: 'hard' },
  { ruleKey: 'required-risk-disclosure', channelSlug: 'press-release', severity: 'hard' },
  { ruleKey: 'required-risk-disclosure', channelSlug: 'whitepaper', severity: 'soft' },
  { ruleKey: 'required-risk-disclosure', channelSlug: 'ad-copy', severity: 'soft' },
  ...['blog','website-copy','newsletter','social-post','meme'].map(ch => ({ ruleKey: 'required-risk-disclosure', channelSlug: ch, severity: 'off' })),

  // max-exclamations: soft, different max per mode
  ...['press-release','legal-disclosure','whitepaper'].map(ch => ({ ruleKey: 'max-exclamations', channelSlug: ch, severity: 'soft', configPatch: { max: 0 } })),
  ...['blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'max-exclamations', channelSlug: ch, severity: 'soft', configPatch: { max: 1 } })),
  ...['social-post','ad-copy'].map(ch => ({ ruleKey: 'max-exclamations', channelSlug: ch, severity: 'soft', configPatch: { max: 3 } })),
  { ruleKey: 'max-exclamations', channelSlug: 'meme', severity: 'off' },

  // emoji-policy: soft, different max per mode
  ...['press-release','legal-disclosure','whitepaper'].map(ch => ({ ruleKey: 'emoji-policy', channelSlug: ch, severity: 'soft', configPatch: { max: 0 } })),
  ...['blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'emoji-policy', channelSlug: ch, severity: 'soft', configPatch: { max: 2 } })),
  { ruleKey: 'emoji-policy', channelSlug: 'social-post', severity: 'soft', configPatch: { max: 5 } },
  { ruleKey: 'emoji-policy', channelSlug: 'ad-copy', severity: 'soft', configPatch: { max: 5 } },
  { ruleKey: 'emoji-policy', channelSlug: 'meme', severity: 'off' },

  // informal-language: hard legal; soft press+whitepaper+balanced; off flexible
  { ruleKey: 'informal-language', channelSlug: 'legal-disclosure', severity: 'hard' },
  ...['press-release','whitepaper','blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'informal-language', channelSlug: ch, severity: 'soft' })),
  ...['social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'informal-language', channelSlug: ch, severity: 'off' })),

  // max-length: soft with specific limits for short-form; off elsewhere
  { ruleKey: 'max-length', channelSlug: 'social-post', severity: 'soft', configPatch: { max_chars: 280 } },
  { ruleKey: 'max-length', channelSlug: 'meme', severity: 'soft', configPatch: { max_chars: 140 } },
  { ruleKey: 'max-length', channelSlug: 'ad-copy', severity: 'soft', configPatch: { max_chars: 125 } },
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'max-length', channelSlug: ch, severity: 'off' })),

  // tone-matches-channel, unsupported-claims: soft in all 9
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter','social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'tone-matches-channel', channelSlug: ch, severity: 'soft' })),
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter','social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'unsupported-claims', channelSlug: ch, severity: 'soft' })),

  // plain-language: soft in strict+balanced; off in flexible
  ...['press-release','legal-disclosure','whitepaper','blog','website-copy','newsletter'].map(ch => ({ ruleKey: 'plain-language', channelSlug: ch, severity: 'soft' })),
  ...['social-post','meme','ad-copy'].map(ch => ({ ruleKey: 'plain-language', channelSlug: ch, severity: 'off' })),
];

export const demoBrand = {
  name: 'NimbusPay',
  voice: 'Clear, calm and confident. We explain money in plain language and never hype it. We speak to people, not segments.',
  pillars: ['Transparent', 'Trustworthy', 'Plainspoken', 'Human'],
  inviteCode: 'NIMBUS-DEMO',
  redactBeforeAi: true,
  confidentialTerms: ['Project Aurora', 'acquisition target'],
};

export const demoUsers = [
  { email: 'manager@contexta-demo.com', fullName: 'Ananya Mehta', role: 'manager' as const },
  { email: 'writer@contexta-demo.com', fullName: 'Rohan Verma', role: 'writer' as const },
  { email: 'priya@contexta-demo.com', fullName: 'Priya Nair', role: 'writer' as const },
  { email: 'sam@contexta-demo.com', fullName: 'Sam Carter', role: 'writer' as const },
];
