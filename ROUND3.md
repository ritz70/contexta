# Planned Round 3 Improvements (15 Pts Rubric)

For Round 3 ("The Scaling & Ecosystem Frontier"), Team Coriolis has planned three substantial, architectural expansions that elevate **Contexta** from an application into an enterprise-wide governance layer.

---

## 1. Universal Workflow Extension: Headless CMS Webhooks & Browser Extension

### The Problem
While our TipTap web editor is fast and rich, enterprise content creators often draft in **Google Docs**, design in **Figma**, or publish directly within headless CMS tools like **Contentful**, **Sanity**, or **WordPress**. Requiring copy-pasting into Contexta introduces adoption friction.

### Technical Architecture for Round 3
```
┌──────────────────────────────┐
│ Chrome Extension             │ ◄───► ContentEditable Observer (Google Docs / CMS)
└──────────────┬───────────────┘
               │ Secure WebSocket / SSE (Sub-10ms)
               ▼
┌──────────────────────────────┐
│ Contexta Engine Daemon (Wasm)│ ◄───► Local WebAssembly Compiled Engine (<1ms check)
└──────────────┬───────────────┘
               │ Background Sync
               ▼
┌──────────────────────────────┐
│ Contexta Cloud API           │ ◄───► CMS Webhooks (Contentful / Sanity Pre-publish Validation)
└──────────────────────────────┘
```

1. **Lightweight Chrome Extension**:
   - Compiles our pure TypeScript rule engine (`src/lib/engine`) directly to **WebAssembly (Wasm)**.
   - Evaluates content locally in the browser with **sub-millisecond latency** inside Google Docs, LinkedIn composer, or WordPress.
   - Synchronizes audit events and disputes back to the central Contexta Supabase instance.
2. **Headless CMS Webhook Gatekeeper**:
   - Native apps for Contentful and Sanity that intercept CMS `before_publish` webhook triggers.
   - Executes the authoritative server publish gate and prevents publishing if critical compliance flags remain open.

---

## 2. Multi-Modal Brand Safety (Visual, Logo, and Contrast Governance)

### The Problem
Brand guidelines govern more than text — they mandate strict rules regarding **logo clearspace**, **typography scales**, **color contrast ratios (WCAG AAA)**, and **imagery aesthetics**. Today, visual review is entirely manual.

### Technical Architecture for Round 3
1. **Vector & Logo Clearance Engine**:
   - Integrated Computer Vision pipeline using OpenCV and canvas geometry.
   - Automatically detects brand logo bounding boxes on marketing banners, social image cards, and PDF decks.
   - Measures surrounding clearspace margins against configured minimum ratios.
2. **Accessibility & Contrast Verification**:
   - Scans image palettes against brand primary/secondary color palettes.
   - Verifies color contrast ratios between background hues and typography to guarantee automated ADA/WCAG compliance before publication.
3. **Multimodal LLM Tone & Imagery Analysis**:
   - Sends social media image + caption pairs through vision-capable models (e.g. Gemini 3.8 Flash Vision) to ensure visual tone matches the written channel mode.

---

## 3. Autonomous Rule Distillation & Dynamic Calibration (Semantic Learning Engine)

### The Problem
In large enterprises with hundreds of writers, managers receive dozens of disputes each week. While managers can update rules manually, guidelines frequently suffer from "rule drift" — patterns become overly strict or obsolete over time.

### Technical Architecture for Round 3
```
┌──────────────────────────────────────┐
│ Manager Dispute Decisions (History)  │
└──────────────────┬───────────────────┘
                   │ Weekly Batch Aggregation
                   ▼
┌──────────────────────────────────────┐
│ Semantic Embedding & Clustering      │
│ (Groups related overturns & rationales)
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ Automated Rule Calibration Proposal  │
│ - Calibrated Regex Refinements       │
│ - New Exception Phrases              │
│ - Severity Downgrades per Channel    │
└──────────────────┬───────────────────┘
                   │
                   ▼ Manager 1-Click Approval
┌──────────────────────────────────────┐
│ Deployed Rule Update + Impact Report │
└──────────────────────────────────────┘
```

1. **Vector Embedding Clustering**:
   - Embeds disputed text fragments and manager decision notes into vector space.
   - Discovers latent clusters of recurrent false positives (e.g. valid industry jargon repeatedly flagged as informal slang).
2. **Autonomous Rule Optimization Agent**:
   - Synthesizes recurring dispute themes into concrete rule improvements.
   - Generates exact regex adjustments or creates new exception phrases.
   - Runs our `/api/rules/impact` simulation across past published documents to calculate the exact reduction in false-positive friction.
3. **One-Click Manager Governance**:
   - Delivers a weekly "Guideline Health Report" to managers proposing calibrated rule updates that can be reviewed and accepted with a single click.
