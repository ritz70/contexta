// Engine barrel export

export { runDeterministicRules } from './checker';
export { resolveRules } from './resolve';
export { computeFingerprint, reconcileFlags } from './fingerprint';
export { canonicalText, buildOffsetMap, canonicalToPm, pmToCanonical } from './offsets';
export type {
  Rule,
  RuleOverride,
  Channel,
  ResolvedRule,
  EngineFlag,
  FlagSuggestion,
  CheckSummary,
  RuleType,
  BaseSeverity,
  EffectiveSeverity,
  FlagSeverity,
  FlagSource,
  FlagScope,
  FlagStatus,
  OverrideSeverity,
  ChannelMode,
  TermMapConfig,
  RequiredPhraseConfig,
  RegexConfig,
  MaxLengthConfig,
  EmojiLimitConfig,
  ExclamationLimitConfig,
  LlmConfig,
  RuleConfig,
  DbOrganization,
  DbProfile,
  DbBrandProfile,
  DbChannel,
  DbRule,
  DbRuleOverride,
  DbDocument,
  DbFlag,
  DbDispute,
  DbAuditEvent,
  DbDocumentCheck,
} from './types';
export type { ExistingFlag, ReconciledFlag } from './fingerprint';
export type { ProseMirrorDoc, ProseMirrorNode, OffsetMapEntry } from './offsets';
