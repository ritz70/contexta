// Rule resolution: merge base rules with channel-specific overrides
// Pure function, no I/O

import type { Rule, RuleOverride, Channel, ResolvedRule, EffectiveSeverity, RuleConfig } from './types';

/**
 * Resolves rules for a given channel by applying overrides.
 * Returns only rules that are active (severity !== 'off').
 * LLM rules are included but won't be run by the deterministic engine.
 */
export function resolveRules(
  orgRules: Rule[],
  overrides: RuleOverride[],
  channel: Channel
): ResolvedRule[] {
  const overrideMap = new Map<string, RuleOverride>();
  for (const ov of overrides) {
    if (ov.channelId === channel.id) {
      overrideMap.set(ov.ruleId, ov);
    }
  }

  const resolved: ResolvedRule[] = [];

  for (const rule of orgRules) {
    const override = overrideMap.get(rule.id);

    // Determine effective severity
    let effectiveSeverity: EffectiveSeverity | 'off';
    if (override && override.severity !== 'inherit') {
      effectiveSeverity = override.severity as EffectiveSeverity | 'off';
    } else {
      effectiveSeverity = rule.baseSeverity;
    }

    // Skip disabled rules
    if (effectiveSeverity === 'off') continue;

    // Merge config with override patch
    const effectiveConfig = mergeConfig(rule.config, override?.configPatch ?? {});

    resolved.push({
      rule,
      effectiveSeverity: effectiveSeverity as EffectiveSeverity,
      effectiveConfig,
    });
  }

  return resolved;
}

/**
 * Deep merge base config with an override patch.
 * The patch takes precedence for any key it defines.
 */
function mergeConfig(base: RuleConfig, patch: Record<string, unknown>): RuleConfig {
  if (Object.keys(patch).length === 0) return base;
  return { ...base, ...patch } as RuleConfig;
}
