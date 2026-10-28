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

## 3. Automated Empirical Row Level Security (RLS) Test Suite

Run the comprehensive RLS verification script:

```bash
npm run test:rls
```

This script executes 16 empirical security tests using live Supabase authenticated client sessions and application API endpoints:

| Category | Invariant Verified | Method |
| :--- | :--- | :--- |
| **Client RLS** | Rohan cannot SELECT Priya's document | Supabase anon client with Rohan auth token |
| **Client RLS** | Rohan cannot UPDATE Priya's document | Supabase anon client with Rohan auth token |
| **Client RLS** | Rohan cannot DELETE Priya's document | Supabase anon client with Rohan auth token |
| **Client RLS** | Rohan cannot SELECT Priya's document checks | Supabase anon client with Rohan auth token |
| **Client RLS** | Rohan cannot SELECT Priya's flags | Supabase anon client with Rohan auth token |
| **Client RLS** | Rohan cannot SELECT Priya's disputes | Supabase anon client with Rohan auth token |
| **Client RLS** | Priya cannot SELECT Rohan's document | Supabase anon client with Priya auth token |
| **Client RLS** | Manager can view documents across all writers | Supabase anon client with Manager auth token |
| **Client RLS** | Writer cannot SELECT audit_events | Supabase anon client with Writer auth token |
| **Client RLS** | Writer cannot INSERT into rules | Supabase anon client with Writer auth token |
| **API Routes** | `GET /api/documents/[id]` returns 404 for another writer | Server route session cookie check |
| **API Routes** | `PATCH /api/documents/[id]` returns 404 for another writer | Server route session cookie check |
| **API Routes** | `DELETE /api/documents/[id]` returns 404 for another writer | Server route session cookie check |
| **API Routes** | `POST /api/documents/[id]/publish` returns 404 for another writer | Server route session cookie check |
| **API Routes** | `POST /api/flags/[id]/action` returns 404 for another writer flag | Server route session cookie check |
| **Cross-Org RLS** | User in separate tenant organization sees zero demo data | Supabase anon client across tenant barrier |

---

## 4. Manual End-to-End Walkthrough Script

Judges and evaluators can verify the complete end-to-end user workflow in under 10 minutes:

### Step 1: Sign In via Demo Accounts
1. Open the landing page (`/`) and click **"Sign in or try the demo"** (or go directly to [`/login`](/login)).
2. In the **Demo Accounts** card:
   - Click **"Fill"** next to **Rohan Verma (Writer)**: email and password auto-populate.
   - Click **"Sign in"**.
   - Writers automatically land on **Workspace** (`/app/workspace`).

### Step 2: Open or Create a Document
1. In the documents list, select a pre-seeded draft (e.g., **"Smart Pots Launch Announcement"**) or click **"New Document"**.
2. Notice the **Channel Selector** at the top right:
   - Select **Press Release (Strict Mode)**: Strict legal rules are active.
   - Switch to **Twitter / X (Flexible Mode)**: Informal language rules are relaxed.

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

### Step 6: Per-Writer Data Isolation Verification
1. Note the URL and ID of Rohan's document (e.g. `/app/workspace/abcd-1234`).
2. Open the user menu in the top-right and click **"Sign out"**.
3. On `/login`, click **"Fill"** next to **Priya Nair (Writer)** and sign in.
4. Observe Priya's workspace: Rohan's document is **not visible**.
5. Paste Rohan's document URL (`/app/workspace/abcd-1234`) into the address bar: observe that the page securely returns a clean **404 Not Found**.

### Step 7: Manager Review & Multi-Writer Oversight
1. Sign out and sign in as **Ananya Mehta (Manager)**.
2. Managers automatically land on **Reviews** (`/app/reviews`).
3. View the dispute submitted in Step 4.
4. Click **"Overturn & Create Exception"**:
   - Enter decision note: *"Approved for audit quotes."*
   - Click **"Confirm Overturn"**.
5. Navigate to **Workspace** (`/app/workspace`):
   - Notice the manager-only **"All writers"** / **"My documents"** toggle.
   - Click **"All writers"** to oversee documents across Rohan, Priya, and Sam.

### Step 8: Reset Demo Environment
1. As Ananya (Manager), navigate to **Brand & Team** (`/app/brand`).
2. Scroll to the **"Reset Demo Data"** card in the right column.
3. Click **"Reset Demo Environment"**.
4. Confirm the dialog: observe that the demo workspace, documents, flags, and analytics history are wiped and re-seeded back to baseline, while demo user accounts are preserved.

### Step 9: Inspect Analytics & Audit Trail
1. Visit **Analytics** (`/app/analytics`): View real-time dispute statistics and rule friction heatmaps.
2. Visit **Audit** (`/app/audit`): View the immutable, timestamped record of every check, dispute, decision, and publication.

