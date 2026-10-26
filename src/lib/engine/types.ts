// Type definitions for the rule engine
// Pure types, no I/O

export type RuleType = 'term_map' | 'required_phrase' | 'regex' | 'max_length' | 'emoji_limit' | 'exclamation_limit' | 'llm';
export type BaseSeverity = 'hard' | 'soft' | 'off';
export type EffectiveSeverity = 'hard' | 'soft';
export type FlagSeverity = 'hard' | 'soft' | 'info';
export type FlagSource = 'deterministic' | 'llm';
export type FlagScope = 'span' | 'document';
export type FlagStatus = 'open' | 'accepted' | 'dismissed' | 'disputed' | 'upheld' | 'overturned' | 'auto_resolved';
export type OverrideSeverity = 'inherit' | 'hard' | 'soft' | 'off';
export type ChannelMode = 'strict' | 'balanced' | 'flexible';

export interface TermEntry {
  match: string;
  suggest: string[];
}

export interface TermMapConfig {
  entries: TermEntry[];
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface RequiredPhraseConfig {
  anyOf: string[];
  caseSensitive?: boolean;
  insertText?: string;
}

export interface RegexConfig {
  pattern: string;
  flags?: string;
  message?: string;
  suggest?: string;
}

export interface MaxLengthConfig {
  max_chars: number;
}

export interface EmojiLimitConfig {
  max: number;
}

export interface ExclamationLimitConfig {
  max: number;
}

export interface LlmConfig {
  focus: 'tone' | 'claims' | 'clarity';
  instruction: string;
}

export type RuleConfig = TermMapConfig | RequiredPhraseConfig | RegexConfig | MaxLengthConfig | EmojiLimitConfig | ExclamationLimitConfig | LlmConfig;

export interface Rule {
  id: string;
  orgId: string;
  key: string;
  name: string;
  description: string;
  type: RuleType;
  config: RuleConfig;
  baseSeverity: BaseSeverity;
  dos: string[];
  donts: string[];
  exceptions: string[];
}

export interface RuleOverride {
  id: string;
  orgId: string;
  ruleId: string;
  channelId: string;
  severity: OverrideSeverity;
  configPatch: Record<string, unknown>;
}

export interface Channel {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  mode: ChannelMode;
  formality: number;
  llmThreshold: number;
  description: string;
}

export interface ResolvedRule {
  rule: Rule;
  effectiveSeverity: EffectiveSeverity;
  effectiveConfig: RuleConfig;
}

export interface FlagSuggestion {
  label: string;
  replacement?: string;
  insertText?: string;
}

export interface EngineFlag {
  ruleId: string | null;
  source: FlagSource;
  category: string;
  severity: FlagSeverity;
  scope: FlagScope;
  start: number;
  end: number;
  quote: string;
  explanation: string;
  suggestions: FlagSuggestion[];
  confidence: number;
  fingerprint: string;
}

export interface CheckSummary {
  total: number;
  hard: number;
  soft: number;
  info: number;
  blocking: number;
  llmDropped?: number;
}

// Database row types
export interface DbOrganization {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  org_id: string;
  role: 'writer' | 'manager';
  full_name: string;
  email: string;
  created_at: string;
}

export interface DbBrandProfile {
  org_id: string;
  voice: string;
  pillars: string[];
  redact_before_ai: boolean;
  confidential_terms: string[];
  updated_at: string;
}

export interface DbChannel {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  mode: ChannelMode;
  formality: number;
  llm_threshold: number;
  description: string;
  created_at: string;
}

export interface DbRule {
  id: string;
  org_id: string;
  key: string;
  name: string;
  description: string;
  type: RuleType;
  config: RuleConfig;
  base_severity: BaseSeverity;
  dos: string[];
  donts: string[];
  exceptions: string[];
  created_at: string;
  updated_at: string;
}

export interface DbRuleOverride {
  id: string;
  org_id: string;
  rule_id: string;
  channel_id: string;
  severity: OverrideSeverity;
  config_patch: Record<string, unknown>;
}

export interface DbDocument {
  id: string;
  org_id: string;
  author_id: string;
  title: string;
  channel_id: string | null;
  content: string;
  status: 'draft' | 'published';
  published_at: string | null;
  last_check_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFlag {
  id: string;
  org_id: string;
  document_id: string;
  rule_id: string | null;
  source: FlagSource;
  category: string;
  severity: FlagSeverity;
  scope: FlagScope;
  quote: string;
  start_offset: number | null;
  end_offset: number | null;
  confidence: number | null;
  explanation: string;
  suggestions: FlagSuggestion[];
  fingerprint: string;
  status: FlagStatus;
  status_reason: string | null;
  status_by: string | null;
  status_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDispute {
  id: string;
  org_id: string;
  flag_id: string;
  raised_by: string;
  category: 'false_positive' | 'context_exception' | 'rule_unclear' | 'other';
  reason: string;
  status: 'pending' | 'upheld' | 'overturned' | 'withdrawn';
  decided_by: string | null;
  decision_note: string | null;
  decided_at: string | null;
  rule_change: Record<string, unknown> | null;
  seen_by_writer: boolean;
  created_at: string;
}

export interface DbAuditEvent {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbDocumentCheck {
  id: string;
  document_id: string;
  org_id: string;
  kind: 'deterministic' | 'ai';
  content_snapshot: string;
  channel_id: string | null;
  summary: CheckSummary;
  llm_status: 'ok' | 'failed' | 'skipped' | null;
  created_at: string;
}
