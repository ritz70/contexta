import Link from 'next/link';
import { Shield, ArrowRight, CheckCircle2, GitBranch, Cpu, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-10" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={24} style={{ color: 'var(--cyan)' }} />
          <span className="font-bold text-h3 tracking-wide">CONTEXTA</span>
          <span className="text-caption px-2 py-0.5 rounded font-mono ml-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            Judge Walkthrough & Rubric Map
          </span>
        </div>
        <h1 className="text-display font-bold mt-2" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
          Round 2 Self-Guided Demo
        </h1>
        <p className="text-body mt-2" style={{ color: 'var(--muted)' }}>
          Welcome judges! This 10-minute walkthrough covers each scoring category with clear step-by-step instructions.
        </p>
        <div className="flex gap-4 mt-6 flex-wrap">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-small font-semibold transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
            style={{ background: 'var(--cyan)', color: 'var(--bg)' }}
          >
            Sign in or try the demo →
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg text-small font-medium inline-flex items-center gap-1.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            Create account (Sign up)
          </Link>
        </div>
      </div>

      {/* Rubric Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { category: 'Working Core Workflow', pts: '30 pts', summary: 'Pick channel → edit copy → live checks → accept/dismiss/dispute → server publish gate' },
          { category: 'Technical Depth & Reliability', pts: '25 pts', summary: 'Deterministic rule engine, zero hallucinated blockers, tenant RLS, async AI pass' },
          { category: 'Progress from Round 1', pts: '20 pts', summary: 'Evolved from naive prompt wrapper to 3-tier contextual governance platform' },
          { category: 'Planned Round 3 Improvements', pts: '15 pts', summary: 'CMS webhooks & browser extensions, multi-modal checks, automated rule distillation' },
          { category: 'Usability Without Guidance', pts: '10 pts', summary: 'Demo accounts card, pre-loaded sample drafts, inline fix suggestions, zero friction' },
        ].map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl flex flex-col justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-body">{item.category}</span>
                <span className="text-caption font-bold px-2 py-0.5 rounded font-mono" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
                  {item.pts}
                </span>
              </div>
              <p className="text-small" style={{ color: 'var(--muted)' }}>{item.summary}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Walkthrough Steps */}
      <div className="space-y-8">
        <h2 className="text-h2 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
          Step-by-Step 10-Minute Test Script
        </h2>

        {/* Step 1 */}
        <div className="p-6 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
              1
            </span>
            <h3 className="text-body font-bold">Sign In with Demo Accounts (Usability: 10 pts)</h3>
          </div>
          <p className="text-small" style={{ color: 'var(--muted)' }}>
            Navigate to <strong>/login</strong>. When demo mode is active, the <em>Demo accounts</em> card lists the four pre-seeded team members (Manager Ananya; Writers Rohan, Priya, and Sam). Click <strong>&ldquo;Fill&rdquo;</strong> to populate credentials into the form, then click <strong>&ldquo;Sign in&rdquo;</strong>.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-6 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
              2
            </span>
            <h3 className="text-body font-bold">Create or Open a Document (Core Workflow: 30 pts)</h3>
          </div>
          <p className="text-small" style={{ color: 'var(--muted)' }}>
            In the <strong>Documents</strong> workspace, click an existing draft (e.g. &ldquo;Q3 Compliance Announcement&rdquo;) or click <strong>&ldquo;New Document&rdquo;</strong>.
            Notice how changing the <strong>Channel</strong> (Press Release / Strict vs Twitter / Flexible) instantly modifies the rules in play!
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-6 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
              3
            </span>
            <h3 className="text-body font-bold">Trigger Checks &amp; Examine Inline Highlights</h3>
          </div>
          <p className="text-small" style={{ color: 'var(--muted)' }}>
            Type or edit text in the TipTap editor. Watch the <strong>Deterministic Check</strong> run automatically.
            - Type forbidden claims like <code>100% bug-free</code> or <code>unhackable</code>.
            - See red/yellow underline highlights and cards in the sidebar.
            - Click <strong>&ldquo;Accept Fix&rdquo;</strong> to auto-replace, or <strong>&ldquo;Dismiss&rdquo;</strong>.
          </p>
        </div>

        {/* Step 4 */}
        <div className="p-6 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
              4
            </span>
            <h3 className="text-body font-bold">Dispute a Flag &amp; Complete Manager Review (Learning Loop)</h3>
          </div>
          <p className="text-small" style={{ color: 'var(--muted)' }}>
            Click <strong>&ldquo;Dispute&rdquo;</strong> on any flag as a writer, type a rationale, and submit.
            Then switch to the Manager account (click <strong>&ldquo;Switch demo account&rdquo;</strong> or sign out to /login) and open <strong>Reviews</strong>.
            Approve or overturn the dispute, optionally creating a rule exception!
          </p>
        </div>

        {/* Step 5 */}
        <div className="p-6 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
              5
            </span>
            <h3 className="text-body font-bold">Inspect Analytics &amp; Friction Points</h3>
          </div>
          <p className="text-small" style={{ color: 'var(--muted)' }}>
            Navigate to <strong>Analytics</strong>. View real-time KPIs, rule friction graphs, channel compliance heatmaps, and AI guideline intelligence summaries.
          </p>
        </div>

        {/* Step 6 */}
        <div className="p-6 rounded-xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-caption" style={{ background: 'var(--cyan)', color: 'var(--bg)' }}>
              6
            </span>
            <h3 className="text-body font-bold">Verify Per-Writer Data Isolation &amp; Demo Reset</h3>
          </div>
          <p className="text-small" style={{ color: 'var(--muted)' }}>
            <strong>Data Isolation:</strong> Sign in as Priya Nair and verify Rohan&apos;s documents are hidden. Attempting to directly navigate to another writer&apos;s document returns a clean 404.<br />
            <strong>Demo Reset:</strong> Sign in as Manager Ananya and navigate to <strong>Brand &amp; Team</strong>. Use the <em>Reset Demo Environment</em> card to wipe and re-seed the demo organization back to baseline at any time.
          </p>
        </div>
      </div>

      {/* Round 3 Roadmap */}
      <div className="border-t pt-8 space-y-4" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-h2 font-bold" style={{ fontFamily: 'var(--font-heading), system-ui' }}>
          Three Substantial Round 3 Planned Improvements (15 pts)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="font-bold text-body mb-2 text-cyan-400">1. Headless CMS &amp; Chrome Extension</h4>
            <p className="text-small" style={{ color: 'var(--muted)' }}>
              Embed Contexta directly into Contentful, WordPress, and Google Docs via webhooks and Chrome extension with live WebSockets.
            </p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="font-bold text-body mb-2 text-amber-400">2. Multi-Modal Brand Safety</h4>
            <p className="text-small" style={{ color: 'var(--muted)' }}>
              Image logo placement, color contrast accessibility, and typography validation using computer vision against brand vector kits.
            </p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h4 className="font-bold text-body mb-2 text-purple-400">3. Autonomous Rule Distillation</h4>
            <p className="text-small" style={{ color: 'var(--muted)' }}>
              Self-optimizing guidelines: cluster manager overturns using vector embeddings and suggest calibrated regex or severity changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
