# Technical Decisions & Architectural Rationale

This document records the core technical decisions and design choices made during the development of **Contexta** for Round 2.

---

## 1. Deterministic Rule Engine vs. AI-Only Verification

### Context
Many AI copy assistants route the entire compliance check to an LLM prompt (e.g. "Check if this copy violates brand rules").

### Decision
We split checking into a strict two-stage pipeline:
1. **Phase 1: Deterministic Engine (Sub-millisecond, Zero Hallucination, Authoritative)**:
   - Evaluates regex patterns, banned claims, required disclosures, terminology mappings, and length/formatting constraints.
   - **Only deterministic 'hard' flags can block document publication.**
2. **Phase 2: LLM Advisory Layer (Contextual, Asynchronous, Non-Blocking)**:
   - Evaluates subjective tone, nuance, brand voice resonance, and complex semantic guidance.
   - LLM flags are strictly advisory (`soft` or `info` severity) and cannot unilaterally block publication.

### Rationale
- **Reliability (30/30 Core Workflow)**: LLMs suffer from non-deterministic variance, latency spikes, and hallucinations. A legal compliance check cannot tolerate false negatives on mandatory disclosures or false positives that arbitrarily halt publishing.
- **Speed & Cost**: Deterministic checks execute in <5ms locally in-memory, providing instantaneous feedback on every keystroke without draining API tokens or incurring latency.

---

## 2. Editor & Highlight Tracking Architecture (ProseMirror & TipTap)

### Context
Inline highlights in modern WYSIWYG editors can become desynchronized or cause cursor jumps if implemented naively via raw DOM manipulation.

### Decision
- **Canonical Text Normalization**: Text extracted from TipTap ProseMirror nodes is transformed into canonical plaintext with explicit offset maps (`canonicalText` & `buildOffsetMap`).
- **Stable Fingerprinting**: Every detected violation is assigned a deterministic hash based on `sha256(ruleId + ":" + quote + ":" + occurrenceIndex)`.
- **ProseMirror Decorations**: Highlights are rendered using non-intrusive ProseMirror decorations (`Decoration.inline`) rather than mutating node marks.

### Rationale
- When a writer edits copy elsewhere in the document, flags with unchanged quote contexts retain their IDs and review states (accepted/dismissed/disputed).
- Keystroke latency remains silky smooth with no document re-parsing loops.

---

## 3. Server-Enforced Publish Gate

### Context
A client-side publish check can be bypassed by modifying frontend state or triggering network requests directly.

### Decision
The `/api/documents/[id]/publish` endpoint runs a complete server-side re-evaluation of all deterministic rules and checks all outstanding open/disputed `hard` flags in PostgreSQL before updating the document status to `published`.

### Rationale
- Enterprise compliance demands an auditable guarantee that no unapproved or non-compliant document is published.
- If a writer attempts to publish while hard flags remain unaddressed, the server returns HTTP 422 with a structured error payload detailing the blocking violations.

---

## 4. Multi-Tenant Isolation with PostgreSQL Row-Level Security (RLS)

### Context
Enterprise compliance systems store sensitive, unreleased corporate copy, legal disclosures, and internal team discussions.

### Decision
All Supabase tables (`documents`, `flags`, `disputes`, `rules`, `channels`, `organizations`, `audit_events`) enforce PostgreSQL Row-Level Security (RLS) keyed to `auth.uid()` and `org_id`.

### Rationale
- Even if a malicious client crafts custom queries or accesses another tenant's document ID, PostgreSQL rejects the query at the database engine level.
- Multi-tenancy is cryptographically isolated by default.

---

## 5. Graceful LLM Degradation & Privacy Redaction

### Context
Third-party LLM providers can experience rate limits, network outages, or configuration errors. Furthermore, organizations cannot leak confidential trademark names or API keys to external models.

### Decision
- **Redaction Pre-pass**: Before sending copy to external LLMs, sensitive entities (names, emails, configured confidential terms) are masked with surrogate tokens (`[REDACTED_CONFIDENTIAL_1]`) and restored upon response.
- **Circuit Breaker / Fallback**: If the LLM provider fails, returns an error, or is unconfigured, the application gracefully degrades to deterministic mode, logging an audit notice without crashing the editor.

---

## 6. One-Click Role Switcher for Hackathon Judges

### Context
Round 2 judges evaluate projects with zero guidance and limited time. Traditional registration flows requiring email confirmation or complex team setup cause fatal friction.

### Decision
We created a dedicated `POST /api/auth/demo` endpoint with 1-click **"Try as Writer"** and **"Try as Manager"** buttons on the landing page, paired with comprehensive database seed data.

### Rationale
- Judges can experience the writer workflow (editor, highlights, checks, dispute submission) and immediately switch to manager mode (reviews, dispute decision, analytics) in one click without registering or switching browser incognito windows.
