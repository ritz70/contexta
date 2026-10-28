-- Contexta: Brand Governance Schema
-- Run this in the Supabase SQL Editor or via `npm run db:setup`

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('writer', 'manager')),
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(org_id);

-- ============================================================
-- Helper functions (security definer)
-- ============================================================

CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE TABLE IF NOT EXISTS brand_profiles (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  voice text NOT NULL DEFAULT '',
  pillars text[] NOT NULL DEFAULT '{}',
  redact_before_ai boolean NOT NULL DEFAULT true,
  confidential_terms text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('strict', 'balanced', 'flexible')),
  formality integer NOT NULL CHECK (formality BETWEEN 1 AND 5),
  llm_threshold numeric NOT NULL DEFAULT 0.6,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_channels_org ON channels(org_id);

CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('term_map', 'required_phrase', 'regex', 'max_length', 'emoji_limit', 'exclamation_limit', 'llm')),
  config jsonb NOT NULL DEFAULT '{}',
  base_severity text NOT NULL CHECK (base_severity IN ('hard', 'soft', 'off')),
  dos text[] NOT NULL DEFAULT '{}',
  donts text[] NOT NULL DEFAULT '{}',
  exceptions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, key)
);
CREATE INDEX IF NOT EXISTS idx_rules_org ON rules(org_id);

CREATE TABLE IF NOT EXISTS rule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'inherit' CHECK (severity IN ('inherit', 'hard', 'soft', 'off')),
  config_patch jsonb NOT NULL DEFAULT '{}',
  UNIQUE(rule_id, channel_id)
);
CREATE INDEX IF NOT EXISTS idx_overrides_rule ON rule_overrides(rule_id);
CREATE INDEX IF NOT EXISTS idx_overrides_channel ON rule_overrides(channel_id);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  channel_id uuid REFERENCES channels(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  last_check_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_created ON documents(org_id, created_at);

CREATE TABLE IF NOT EXISTS document_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('deterministic', 'ai')),
  content_snapshot text NOT NULL,
  channel_id uuid REFERENCES channels(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}',
  llm_status text CHECK (llm_status IN ('ok', 'failed', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checks_document ON document_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_checks_org ON document_checks(org_id, created_at);

CREATE TABLE IF NOT EXISTS flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES rules(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('deterministic', 'llm')),
  category text NOT NULL DEFAULT '',
  severity text NOT NULL CHECK (severity IN ('hard', 'soft', 'info')),
  scope text NOT NULL DEFAULT 'span' CHECK (scope IN ('span', 'document')),
  quote text NOT NULL DEFAULT '',
  start_offset integer,
  end_offset integer,
  confidence numeric,
  explanation text NOT NULL DEFAULT '',
  suggestions jsonb NOT NULL DEFAULT '[]',
  fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'dismissed', 'disputed', 'upheld', 'overturned', 'auto_resolved')),
  status_reason text,
  status_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_flags_document ON flags(document_id);
CREATE INDEX IF NOT EXISTS idx_flags_org ON flags(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_flags_rule ON flags(rule_id);

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flag_id uuid NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('false_positive', 'context_exception', 'rule_unclear', 'other')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'overturned', 'withdrawn')),
  decided_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decision_note text,
  decided_at timestamptz,
  rule_change jsonb,
  seen_by_writer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_disputes_flag ON disputes(flag_id);
CREATE INDEX IF NOT EXISTS idx_disputes_org ON disputes(org_id, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_id);

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(org_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read their own org
CREATE POLICY org_select ON organizations FOR SELECT USING (id = auth_org_id());

-- Profiles: members can read profiles in their org; users can update their own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Brand profiles: org members can read; managers can write
CREATE POLICY brand_select ON brand_profiles FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY brand_insert ON brand_profiles FOR INSERT WITH CHECK (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY brand_update ON brand_profiles FOR UPDATE USING (org_id = auth_org_id() AND auth_role() = 'manager');

-- Channels: org members can read; managers can write
CREATE POLICY channels_select ON channels FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY channels_insert ON channels FOR INSERT WITH CHECK (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY channels_update ON channels FOR UPDATE USING (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY channels_delete ON channels FOR DELETE USING (org_id = auth_org_id() AND auth_role() = 'manager');

-- Rules: org members can read; managers can write
CREATE POLICY rules_select ON rules FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY rules_insert ON rules FOR INSERT WITH CHECK (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY rules_update ON rules FOR UPDATE USING (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY rules_delete ON rules FOR DELETE USING (org_id = auth_org_id() AND auth_role() = 'manager');

-- Rule overrides: org members can read; managers can write
CREATE POLICY overrides_select ON rule_overrides FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY overrides_insert ON rule_overrides FOR INSERT WITH CHECK (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY overrides_update ON rule_overrides FOR UPDATE USING (org_id = auth_org_id() AND auth_role() = 'manager');
CREATE POLICY overrides_delete ON rule_overrides FOR DELETE USING (org_id = auth_org_id() AND auth_role() = 'manager');

-- Documents: writers can CRUD their own; managers can read all in org
DROP POLICY IF EXISTS docs_select ON documents;
DROP POLICY IF EXISTS docs_insert ON documents;
DROP POLICY IF EXISTS docs_update ON documents;
DROP POLICY IF EXISTS docs_delete ON documents;

CREATE POLICY docs_select ON documents FOR SELECT USING (
  org_id = auth_org_id() AND (author_id = auth.uid() OR auth_role() = 'manager')
);
CREATE POLICY docs_insert ON documents FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND author_id = auth.uid()
);
CREATE POLICY docs_update ON documents FOR UPDATE USING (
  org_id = auth_org_id() AND (author_id = auth.uid() OR auth_role() = 'manager')
);
CREATE POLICY docs_delete ON documents FOR DELETE USING (
  org_id = auth_org_id() AND (author_id = auth.uid() OR auth_role() = 'manager')
);

-- Document checks: tied to document's author or manager
DROP POLICY IF EXISTS checks_select ON document_checks;
DROP POLICY IF EXISTS checks_insert ON document_checks;
DROP POLICY IF EXISTS checks_update ON document_checks;
DROP POLICY IF EXISTS checks_delete ON document_checks;

CREATE POLICY checks_select ON document_checks FOR SELECT USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_checks.document_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY checks_insert ON document_checks FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_checks.document_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY checks_update ON document_checks FOR UPDATE USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_checks.document_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY checks_delete ON document_checks FOR DELETE USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_checks.document_id
        AND documents.author_id = auth.uid()
    )
  )
);

-- Flags: tied to document's author or manager
DROP POLICY IF EXISTS flags_select ON flags;
DROP POLICY IF EXISTS flags_insert ON flags;
DROP POLICY IF EXISTS flags_update ON flags;
DROP POLICY IF EXISTS flags_delete ON flags;

CREATE POLICY flags_select ON flags FOR SELECT USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = flags.document_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY flags_insert ON flags FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = flags.document_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY flags_update ON flags FOR UPDATE USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = flags.document_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY flags_delete ON flags FOR DELETE USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = flags.document_id
        AND documents.author_id = auth.uid()
    )
  )
);

-- Disputes: tied to flag & document author, raised_by, or manager
DROP POLICY IF EXISTS disputes_select ON disputes;
DROP POLICY IF EXISTS disputes_insert ON disputes;
DROP POLICY IF EXISTS disputes_update ON disputes;
DROP POLICY IF EXISTS disputes_delete ON disputes;

CREATE POLICY disputes_select ON disputes FOR SELECT USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    raised_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM flags
      JOIN documents ON documents.id = flags.document_id
      WHERE flags.id = disputes.flag_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY disputes_insert ON disputes FOR INSERT WITH CHECK (
  org_id = auth_org_id() AND (
    raised_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM flags
      JOIN documents ON documents.id = flags.document_id
      WHERE flags.id = disputes.flag_id
        AND documents.author_id = auth.uid()
    )
  )
);
CREATE POLICY disputes_update ON disputes FOR UPDATE USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    (
      raised_by = auth.uid() AND
      EXISTS (
        SELECT 1 FROM flags
        JOIN documents ON documents.id = flags.document_id
        WHERE flags.id = disputes.flag_id
          AND documents.author_id = auth.uid()
      )
    )
  )
);
CREATE POLICY disputes_delete ON disputes FOR DELETE USING (
  org_id = auth_org_id() AND (
    auth_role() = 'manager' OR
    raised_by = auth.uid()
  )
);

-- Audit events: insert for org members; read for managers only
CREATE POLICY audit_insert ON audit_events FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY audit_select ON audit_events FOR SELECT USING (org_id = auth_org_id() AND auth_role() = 'manager');

-- Feedback: insert for anyone authenticated; read for managers of same org
CREATE POLICY feedback_insert ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY feedback_select ON feedback FOR SELECT USING (
  (org_id IS NULL AND auth_role() = 'manager') OR org_id = auth_org_id()
);
