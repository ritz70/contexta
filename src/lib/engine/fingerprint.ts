// Fingerprinting and reconciliation for flags
// Pure functions, no I/O

import type { EngineFlag, FlagStatus } from './types';

/**
 * Compute a fingerprint for a flag.
 * fingerprint = hash(ruleId | normalized lowercase quote | occurrence index)
 */
export function computeFingerprint(
  ruleId: string | null,
  quote: string,
  occurrenceIndex: number
): string {
  const normalized = (quote || '').toLowerCase().trim();
  const input = `${ruleId ?? 'null'}|${normalized}|${occurrenceIndex}`;
  return simpleHash(input);
}

/**
 * Simple deterministic hash (djb2 variant).
 * Not cryptographic; good enough for fingerprints.
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(36);
}

export interface ExistingFlag {
  fingerprint: string;
  status: FlagStatus;
  id: string;
  quote: string;
  start_offset: number | null;
  end_offset: number | null;
}

export interface ReconciledFlag extends EngineFlag {
  existingId?: string;
  existingStatus?: FlagStatus;
  action: 'upsert' | 'keep' | 'auto_resolve';
}

/**
 * Reconcile new engine flags with existing DB flags.
 *
 * Rules:
 * - If a new flag has the same fingerprint as an existing one:
 *   - If the existing is dismissed/disputed/upheld/overturned → keep that status
 *   - Otherwise → upsert with new data
 * - If an existing flag has no matching new flag:
 *   - If it's open or disputed → auto_resolve
 *   - Otherwise → keep as-is
 */
export function reconcileFlags(
  newFlags: EngineFlag[],
  existingFlags: ExistingFlag[]
): { reconciled: ReconciledFlag[]; toAutoResolve: string[] } {
  const existingByFingerprint = new Map<string, ExistingFlag>();
  for (const ef of existingFlags) {
    existingByFingerprint.set(ef.fingerprint, ef);
  }

  const matchedFingerprints = new Set<string>();
  const reconciled: ReconciledFlag[] = [];

  for (const nf of newFlags) {
    const existing = existingByFingerprint.get(nf.fingerprint);
    matchedFingerprints.add(nf.fingerprint);

    if (existing) {
      const preserveStatuses: FlagStatus[] = ['dismissed', 'disputed', 'upheld', 'overturned', 'accepted'];
      if (preserveStatuses.includes(existing.status)) {
        reconciled.push({
          ...nf,
          existingId: existing.id,
          existingStatus: existing.status,
          action: 'keep',
        });
      } else {
        reconciled.push({
          ...nf,
          existingId: existing.id,
          existingStatus: existing.status,
          action: 'upsert',
        });
      }
    } else {
      reconciled.push({
        ...nf,
        action: 'upsert',
      });
    }
  }

  // Find flags that need auto-resolution
  const toAutoResolve: string[] = [];
  for (const ef of existingFlags) {
    if (!matchedFingerprints.has(ef.fingerprint)) {
      if (ef.status === 'open' || ef.status === 'disputed') {
        toAutoResolve.push(ef.id);
      }
    }
  }

  return { reconciled, toAutoResolve };
}
