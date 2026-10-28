# CONTEXTA — Brand Sovereign

> **The Adaptive Brand Governance Ecosystem for Enterprise AI**  
> Built by **Team Coriolis** (Narula Institute of Technology) for Round 2: The Build.

---

## 🌟 Executive Summary

Enterprise teams write copy for dozens of distinct destinations — from high-stakes press releases and legal disclaimers to casual social posts, internal memos, and customer newsletters. Traditional brand compliance is either **inflexibly rigid** (blocking harmless social creativity) or **dangerously lax** (risking legal liability and brand dilution).

**Contexta** introduces **Contextual Brand Governance**:
1. **Three Enforcement Modes**:
   - 🔴 **Strict**: Press releases, legal disclosures, whitepapers (zero tolerance, blocking errors).
   - 🟡 **Balanced**: Blogs, website copy, newsletters (preserves brand voice, flags stylistic warnings).
   - 🔵 **Flexible**: Social media, ad copy, community banter (advisory guidance, emojis and colloquialisms permitted).
2. **Deterministic Gates Decide; AI Advises**: Hard compliance rules (forbidden claims, trademark casing, disclosure mandates) are evaluated deterministically in sub-millisecond execution with **zero hallucinations**. AI provides contextual tone analysis and creative rewrites.
3. **The Learning Loop**: Every flag action (accept, dismiss, dispute) is tracked. Writer disputes feed manager review workflows, allowing rules to dynamically evolve or grant channel exceptions.

---

## 🏆 Scoring Rubric Alignment (100 Pts)

| Rubric Category | Points | Contexta Implementation |
| :--- | :--- | :--- |
| **Working Core Workflow** | **30 pts** | Complete start-to-finish pipeline: Select Channel → Real-time Editor → Deterministic & AI Checking → Flag Actioning (Accept/Dismiss/Dispute) → Server-enforced Publish Gate. |
| **Technical Depth & Reliability** | **25 pts** | Pure TypeScript deterministic rule engine, ProseMirror decoration offset maps, Supabase PostgreSQL with tenant Row-Level Security (RLS), multi-model LLM abstraction with redaction. |
| **Progress from Round 1** | **20 pts** | Detailed in [`CHANGES.md`](./CHANGES.md): Evolved from a simple static prompt wrapper into an enterprise multi-tier governance platform with audit logging, analytics, and dispute learning loops. |
| **Planned Round 3 Improvements** | **15 pts** | Detailed in [`ROUND3.md`](./ROUND3.md): Headless CMS & Chrome extension, Computer Vision Multi-Modal Asset Governance, Autonomous Guideline Distillation. |
| **Usability Without Guidance** | **10 pts** | Dedicated self-guided judge walkthrough at [`/guide`](./src/app/guide/page.tsx), 1-click writer & manager demo logins, pre-seeded documents and rules, zero friction. |

---

## ⚡ Quick Start & Evaluator Access

### Sign In & Demo Access (`/login`)
Visit [`/login`](http://localhost:3000/login) (or click **"Sign in or try the demo"** on the landing page). When running in demo mode (`NEXT_PUBLIC_DEMO_MODE=true`), the login page provides a **Demo Accounts Card** with one-click **"Fill"** buttons for 4 seeded personas:
- **Ananya Mehta** (`manager@contexta-demo.com`) — Manager (lands on `/app/reviews` with full org-wide review, rule configuration, audit oversight, and demo reset authority).
- **Rohan Verma** (`writer@contexta-demo.com`) — Writer (lands on `/app/workspace` with pre-seeded sample drafts).
- **Priya Nair** (`priya@contexta-demo.com`) — Writer (isolated workspace; can only view and edit Priya's documents).
- **Sam Carter** (`sam@contexta-demo.com`) — Writer (isolated workspace; cannot view Rohan or Priya's documents).

**Shared Demo Password:** `Contexta#Demo2026`  
**Demo Organization Invite Code:** `NIMBUS-DEMO` (use on [`/signup`](http://localhost:3000/signup) to join as a fresh writer with an empty workspace).

> **Data Isolation Rule:** *Each writer sees only their own documents. The manager sees everyone's.*

### Interactive Walkthrough
Visit [`/guide`](http://localhost:3000/guide) at any time for the guided 10-minute evaluator test script.

### Verify Data Isolation
Run the automated empirical RLS test suite:
```bash
npm run test:rls
```


---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, React 19, Server Components & Server Actions)
- **Editor**: [TipTap](https://tiptap.dev) / ProseMirror with custom inline decorations and document-level flags
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL 15, RLS policies, SSR auth cookies)
- **Engine**: Pure TypeScript rule execution engine (`/src/lib/engine`)
- **UI & Styling**: Vanilla CSS design tokens + Tailwind CSS + Lucide Icons + Recharts
- **Testing**: [Vitest](https://vitest.dev) unit test suite with 100% engine pass rate
- **Type Safety**: TypeScript 5 + Zod schema validation

---

## 🚀 Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/team-coriolis/contexta.git
cd contexta

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# 4. Run database setup and seed
npm run setup

# 5. Run tests
npm test

# 6. Typecheck
npm run typecheck

# 7. Start dev server
npm run dev
```

---

## 📚 Documentation Index

- [`DECISIONS.md`](./DECISIONS.md) — Technical choices and engineering decisions
- [`FEATURES.md`](./FEATURES.md) — Exhaustive catalog of implemented capabilities
- [`CHANGES.md`](./CHANGES.md) — Evolution from Round 1 idea to Round 2 implementation
- [`ROUND3.md`](./ROUND3.md) — Three planned, high-impact improvements for Round 3
- [`TESTING.md`](./TESTING.md) — Test suites, coverage, and manual QA validation script
- [`SETUP.md`](./SETUP.md) — Detailed environment setup and Supabase configuration guide
- [`CREDITS.md`](./CREDITS.md) — Team Coriolis member attribution and open-source licenses
- [`SUBMISSION.md`](./SUBMISSION.md) — Formal Hackathon Round 2 Submission Document
