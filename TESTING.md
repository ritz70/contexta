# Testing & Quality Assurance Guide

This document outlines the testing strategy, automated test suites, manual verification scripts, and quality checklists for **Contexta**.

---

## 1. Automated Test Suite (Vitest)

Our automated unit test suite covers the pure TypeScript deterministic engine (`src/lib/engine`) with **100% pass rate** and zero external dependencies or network mocks.

### Running the Tests

```bash
npm test
```

### Test Coverage Highlights

The tests in [`tests/engine.test.ts`](./tests/engine.test.ts) validate:
1. **Canonical Normalization & Offset Mapping**:
   - Converts nested TipTap/ProseMirror JSON document trees into canonical text strings.
   - Accurately builds bidirectional index mappings between ProseMirror editor positions and string character offsets (`canonicalToPm` & `pmToCanonical`).
2. **Deterministic Fingerprinting**:
   - Computes persistent, cryptographic SHA-256 hashes (`computeFingerprint`) based on `ruleId`, `quote`, and `occurrenceIndex`.
   - Guarantees flag identity stability across edits elsewhere in the document.
3. **Rule Pattern Violations**:
   - `regex`: Accurately catches banned superlatives, unverified claims, and case-insensitive phrases with auto-replacement suggestions.
   - `term_map`: Enforces official casing and preferred terminology with first-letter case preservation.
   - `emoji_limit`: Detects and flags Unicode emoji counts exceeding channel thresholds.
   - Clean documents return zero flags without false positives.
4. **Channel Rule Resolution & Overrides**:
   - Merges base organization rules with channel-specific override configurations.
   - Correctly downgrades severity (e.g. `hard` → `soft`) for flexible channels.
   - Deactivates rules completely when severity is set to `'off'`.

---

## 2. TypeScript Compilation Check

```bash
npm run typecheck
```

- Strict type-checking enabled (`"strict": true`).
- Validates all API route schemas, Zod definitions, Supabase client calls, and React component props with zero compilation errors.

---

## 3. Manual End-to-End Walkthrough Script

Judges and evaluators can verify the complete end-to-end user workflow in under 10 minutes:

### Step 1: 1-Click Login
1. Open the landing page (`/`).
2. Click **"Try as Writer"**.
3. You are automatically signed in as `writer@contexta.local` and redirected to `/app/workspace`.

### Step 2: Open or Create a Document
1. In the documents list, select a pre-seeded draft (e.g., **"Q3 Compliance Announcement"**) or click **"New Document"**.
2. Notice the **Channel Selector** at the top right:
   - Select **Press Release (Strict Mode)**: Notice strict legal rules are active.
   - Switch to **Twitter / X (Flexible Mode)**: Notice informal language rules are relaxed.

### Step 3: Trigger Real-Time Inline Checks
1. Type a forbidden phrase into the editor:
   > "Our new platform is completely **unhackable** and guarantees **100% bug-free** code."
2. Within milliseconds, watch red underline decorations appear under "unhackable" and "100% bug-free".
3. The right-hand **Flags Sidebar** displays cards explaining the violation and citing brand guidelines.

### Step 4: Resolve and Dispute Flags
1. Click **"Accept Fix"** on the first flag card: the text in the editor immediately updates to the approved replacement.
2. Click **"Dispute"** on the second flag card:
   - Select category: *"Context Exception"*.
   - Enter reason: *"Quoting third-party security audit report."*
   - Click **"Submit Dispute"**.
   - The flag status changes to **Disputed**.

### Step 5: Test the Server-Side Publish Gate
1. Click the **"Publish"** button in the header while unaddressed hard flags remain.
2. Notice the operation is blocked with a clear warning explaining that blocking issues must be resolved first.

### Step 6: Manager Review & Rule Update
1. Sign out and click **"Try as Manager"** on the home page.
2. Go to **Reviews** (`/app/reviews`).
3. View the dispute submitted in Step 4.
4. Click **"Overturn & Create Exception"**:
   - Enter decision note: *"Approved for audit quotes."*
   - Click **"Confirm Overturn"**.
5. Switch back to the document — the flag is now overturned and the document can be published!

### Step 7: Inspect Analytics & Audit Trail
1. Visit **Analytics** (`/app/analytics`): View real-time dispute statistics and rule friction heatmaps.
2. Visit **Audit** (`/app/audit`): View the immutable, timestamped record of every check, dispute, decision, and publication.
