# Contexta — Feature Catalog & Capabilities

This document provides a comprehensive breakdown of all features and capabilities implemented in Contexta for Hackathon Round 2.

---

## 1. Contextual Channel Governance

- **Three Enforcement Modes**:
  - **Strict**: Critical compliance channels (Press Releases, Legal Filings, Financial Disclosures). Enforces zero-tolerance blocking gates.
  - **Balanced**: Standard public-facing channels (Company Blogs, Official Website, Newsletters). Flags warnings while permitting creative nuance.
  - **Flexible**: Fast-moving social and informal channels (Twitter/X, LinkedIn, Slack). Relaxes stylistic constraints and emoji caps while safeguarding core brand safety.
- **Channel Matrix Configuration**:
  - Live configuration UI (`/app/channels`) allowing managers to define default enforcement modes, target word counts (min/max), and specific tone guidelines per channel.
  - Channel-specific rule overrides: rules can inherit org-wide default severity, downgrade to warning/info, or be completely deactivated for particular destinations.

---

## 2. Real-Time ProseMirror Editor (`/app/workspace/[id]`)

- **TipTap / ProseMirror Rich Text Architecture**:
  - Clean, distraction-free typing environment with title, formatting toolbar, and word count monitors.
  - Non-destructive inline decorations highlighting detected issues directly in the text without corrupting ProseMirror document node structure.
- **Color-Coded Visual Indicators**:
  - 🔴 **Red (Hard / Blocking)**: Must be resolved or accepted before publishing.
  - 🟡 **Yellow (Soft / Warning)**: Stylistic deviations or tone warnings.
  - 🔵 **Blue (Info / Advisory)**: Contextual suggestions and brand voice enhancements.
- **Interactive Flag Sidebar**:
  - Collapsible drawer listing all detected violations categorized by rule.
  - Clicking an inline highlight immediately scrolls to and expands the corresponding card.
  - Displays rule description, rationale, do's & don'ts, and automated replacement suggestions.
- **One-Click Flag Actions**:
  - **Accept Fix**: Instantly replaces the offending text with the approved brand replacement.
  - **Dismiss**: Suppresses the warning with recorded user intent.
  - **Dispute**: Opens the dispute modal for writers to contest false positives.
- **Document-Level Flags**:
  - Flags that apply to the entire document (e.g. missing mandatory disclosure statements, exceeded total character limits) render in a dedicated document-header banner.
- **Server-Enforced Publish Gate**:
  - The "Publish" action triggers an authoritative server-side check.
  - If any unresolved hard flags exist, publishing is blocked with actionable feedback.

---

## 3. High-Performance Deterministic Engine (`src/lib/engine`)

- **Sub-5ms Execution**:
  - Runs in pure TypeScript without I/O or network requests.
  - High-performance regex compilation, plain text term-map scanning, and boundary checks.
- **Supported Rule Types**:
  1. `term_map`: Brand terminology mapping with case-preservation (e.g. "anti-gravity" → "Antigravity").
  2. `required_phrase`: Mandatory disclosures and disclaimers (e.g. Forward-looking statement warnings).
  3. `regex`: Complex pattern matching for banned superlative claims, unverified metrics, and formatting rules.
  4. `max_length`: Channel-specific character/word boundaries.
  5. `emoji_limit`: Configurable ceiling on Unicode emoji counts.
  6. `exclamation_limit`: Caps on excessive punctuation (e.g. multiple exclamation marks `!!`).
- **Stable Fingerprinting**:
  - Generates deterministic hashes for every violation (`sha256(ruleId:quote:occurrence)`) enabling flag state to persist across edits.

---

## 4. Phase 2 AI & Privacy Layer (`src/lib/llm`)

- **Provider Agnostic**:
  - Built-in lightweight adapters for Google Gemini (`gemini-3.8-flash`), OpenAI-compatible endpoints, and Anthropic Claude.
- **Privacy Redaction Engine**:
  - Masks sensitive proprietary terminology and PII before dispatching text to third-party models.
  - Transparently restores tokens in suggestion outputs.
- **Fix-It Multi-Alternative Generator**:
  - Dedicated `/api/fix-it` endpoint generating 3 distinct creative alternatives tailored to channel tone.
- **Automatic Channel Classifier**:
  - Dedicated `/api/infer-channel` analyzing draft vocabulary, structure, and length to recommend the optimal publishing channel.

---

## 5. Dispute & Review Learning Loop (`/app/reviews`)

- **Writer Dispute Submission**:
  - Writers can flag rules as false positives, context exceptions, or unclear guidelines.
- **Manager Review Dashboard**:
  - Filter by pending, upheld, or overturned disputes.
  - One-click decisions with mandatory rationale.
  - **Dynamic Rule Evolution**: Managers can simultaneously overturn a dispute and update the underlying rule (adding exception phrases or downgrading severity across channels).
- **Notification Bell**:
  - Live indicator tracking pending reviews for managers and decision notifications for writers.

---

## 6. Real-Time Analytics & Intelligence (`/app/analytics`)

- **Executive KPI Cards**:
  - Total Checks Run, Flag Volume, Dispute Rate, and Auto-Resolve Accuracy.
- **Rule Friction Alerts**:
  - Automatically identifies "high-friction" rules with dispute rates exceeding 15% to alert managers to ambiguous guidelines.
- **Interactive Visualizations (Recharts)**:
  - Weekly compliance trendline.
  - Flag distribution by channel.
  - Violation frequency by rule category.

---

## 7. Enterprise Governance & Auditing

- **Immutable Audit Trail (`/app/audit`)**:
  - Logs all security and governance events: check runs, flags accepted/dismissed, disputes lodged and decided, documents published, and rule updates.
  - Searchable by action type, user, and entity ID.
- **Brand Identity Hub (`/app/brand`)**:
  - Centralized repository of brand voice traits, core values, forbidden corporate claims, and team permissions.
- **Writer Guidelines Reference (`/app/guidelines`)**:
  - Dedicated reading hub for writers to browse active rules, do's & don'ts, and channel constraints without manager editing privileges.
- **Judge Walkthrough (`/guide`)**:
  - Self-guided 10-minute test script highlighting every Hackathon scoring rubric dimension.

---

## 8. Authentication, Per-Writer Data Isolation & Demo Access

- **Secure Session Authentication (`/login`)**:
  - Real email/password authentication using Supabase SSR session cookies.
  - Password visibility toggle (show/hide).
  - Unauthenticated route guarding via Next.js middleware with automatic `?next=<path>` redirection.
  - Role-based post-login routing: Managers land on `/app/reviews`; Writers land on `/app/workspace`.
- **Demo Accounts Card (`/login`)**:
  - Active when `NEXT_PUBLIC_DEMO_MODE=true`.
  - Lists 4 seeded demo accounts with role badges:
    - **Ananya Mehta** (`manager@contexta-demo.com`) — Manager
    - **Rohan Verma** (`writer@contexta-demo.com`) — Writer
    - **Priya Nair** (`priya@contexta-demo.com`) — Writer
    - **Sam Carter** (`sam@contexta-demo.com`) — Writer
  - One-click "Fill" buttons for instant credential population.
  - One-click copy buttons for the shared demo password and `NIMBUS-DEMO` invite code.
  - Clear data isolation disclosure: *"Each writer sees only their own documents. The manager sees everyone's."*
- **Per-Writer Row Level Security (RLS) Isolation**:
  - Database-enforced isolation across `documents`, `document_checks`, `flags`, and `disputes`.
  - Writers can only SELECT, INSERT, UPDATE, or DELETE records where `documents.author_id = auth.uid()`.
  - Attempting to access another writer's document via direct URL (`/app/workspace/[id]`) or API (`/api/documents/[id]`) returns a clean 404 Not Found.
  - Workspace document listing strictly isolates drafts per writer; the "All writers" filter toggle is manager-only.
  - Cross-tenant multi-tenant safety guarantees users from other organizations see zero demo data.
- **Self-Service Organization Onboarding (`/signup`)**:
  - **Create Organization**: Creates a new tenant organization with starter channels and rules; sets the creator as Manager.
  - **Join with Invite Code**: Joining with `NIMBUS-DEMO` creates a new Writer in the demo organization with an empty workspace.
  - Input validation with clear error messages for invalid invite codes and duplicate emails.
- **Manager-Only Demo Environment Reset (`/app/brand`)**:
  - Dedicated maintenance card rendered only for Managers of demo organizations (`is_demo = true`).
  - Confirmation modal warning that custom drafts and disputes will be cleared.
  - Protected API route (`POST /api/brand/reset-demo`) that wipes and re-seeds only that organization's documents, checks, flags, disputes, and analytics history.
  - Preserves the 4 baseline demo accounts and passwords.
  - Rate-limited to 3 resets per hour with immutable audit event logging (`action: 'reset_demo_data'`).
- **Empirical RLS Validation Suite (`npm run test:rls`)**:
  - Automated test runner verifying 16 distinct security invariants across client queries, API routes, and tenant boundaries.
  - Outputs a clear PASS/FAIL results table.

