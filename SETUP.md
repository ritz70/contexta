# Setup & Deployment Guide

This guide walks through configuring, installing, database migrating, and seeding **Contexta** for local development and cloud hosting.

---

## 1. Prerequisites

- **Node.js**: v18.18.0 or newer (v20+ recommended)
- **npm**: v9+
- **Supabase Account**: A free Supabase project or local Supabase CLI instance.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project API URL | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client anon key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret admin service key (server-only) | `eyJhbGciOi...` |
| `DATABASE_URL` | Direct PostgreSQL connection string | `postgresql://postgres:[PASS]@db.xyz.supabase.co:5432/postgres` |

### Optional AI Variables (Graceful Fallback if omitted)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | LLM provider adapter (`gemini`, `openai`, `anthropic`) | `gemini` |
| `LLM_API_KEY` | Provider API key | *(Optional — fallback heuristics run if omitted)* |
| `LLM_MODEL` | Specific model identifier | `gemini-3.8-flash` |
| `LLM_BASE_URL` | Custom base URL (for Ollama or local proxies) | *(Empty)* |

---

## 3. Database Schema Migration

Contexta provides a migration script that executes the complete PostgreSQL schema (tables, foreign keys, triggers, and Row-Level Security policies):

```bash
npm run db:setup
```

Alternatively, you can copy the contents of [`supabase/schema.sql`](./supabase/schema.sql) directly into the Supabase SQL Editor.

---

## 4. Seeding Initial Data & Demo Accounts

Run the comprehensive seeding script:

```bash
npm run seed
```

This populates:
1. **Organization**: "Nimbus Financial Technologies"
2. **Demo Users**:
   - **Manager**: `manager@contexta-demo.com` / `demo-password-123!`
   - **Writer**: `writer@contexta-demo.com` / `demo-password-123!`
3. **Channels**: Press Release (Strict), Company Blog (Balanced), Twitter / X (Flexible), Newsletter, Slack.
4. **Starter Rules & Overrides**: Terminology casing, forbidden claims, required disclaimers, length limits.
5. **Sample Drafts**: Pre-loaded articles in various states of compliance.
6. **30-Day Historical Data**: Pre-seeded check events, disputes, and friction alerts for analytics.

*Shortcut to run both database setup and seed:*
```bash
npm run setup
```

---

## 5. Starting the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
