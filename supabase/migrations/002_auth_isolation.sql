-- Contexta: 002_auth_isolation.sql
-- Idempotent Migration: Per-writer data isolation and organization demo flag
-- Enforces that writers can only view/mutate their own documents, checks, flags, and disputes,
-- while managers can view and adjudicate all documents within their organization.

-- 1. Add is_demo column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

-- 2. Documents RLS
DROP POLICY IF EXISTS docs_select ON documents;
DROP POLICY IF EXISTS docs_insert ON documents;
DROP POLICY IF EXISTS docs_update ON documents;
DROP POLICY IF EXISTS docs_delete ON documents;

CREATE POLICY docs_select ON documents
  FOR SELECT USING (
    org_id = auth_org_id() AND (author_id = auth.uid() OR auth_role() = 'manager')
  );

CREATE POLICY docs_insert ON documents
  FOR INSERT WITH CHECK (
    org_id = auth_org_id() AND author_id = auth.uid()
  );

CREATE POLICY docs_update ON documents
  FOR UPDATE USING (
    org_id = auth_org_id() AND (author_id = auth.uid() OR auth_role() = 'manager')
  );

CREATE POLICY docs_delete ON documents
  FOR DELETE USING (
    org_id = auth_org_id() AND (author_id = auth.uid() OR auth_role() = 'manager')
  );

-- 3. Document Checks RLS (tied to document's author or manager)
DROP POLICY IF EXISTS checks_select ON document_checks;
DROP POLICY IF EXISTS checks_insert ON document_checks;
DROP POLICY IF EXISTS checks_update ON document_checks;
DROP POLICY IF EXISTS checks_delete ON document_checks;

CREATE POLICY checks_select ON document_checks
  FOR SELECT USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_checks.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

CREATE POLICY checks_insert ON document_checks
  FOR INSERT WITH CHECK (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_checks.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

CREATE POLICY checks_update ON document_checks
  FOR UPDATE USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_checks.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

CREATE POLICY checks_delete ON document_checks
  FOR DELETE USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_checks.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

-- 4. Flags RLS (tied to document's author or manager)
DROP POLICY IF EXISTS flags_select ON flags;
DROP POLICY IF EXISTS flags_insert ON flags;
DROP POLICY IF EXISTS flags_update ON flags;
DROP POLICY IF EXISTS flags_delete ON flags;

CREATE POLICY flags_select ON flags
  FOR SELECT USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = flags.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

CREATE POLICY flags_insert ON flags
  FOR INSERT WITH CHECK (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = flags.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

CREATE POLICY flags_update ON flags
  FOR UPDATE USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = flags.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

CREATE POLICY flags_delete ON flags
  FOR DELETE USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = flags.document_id
          AND documents.author_id = auth.uid()
      )
    )
  );

-- 5. Disputes RLS (tied to flag & document author, raised_by, or manager)
DROP POLICY IF EXISTS disputes_select ON disputes;
DROP POLICY IF EXISTS disputes_insert ON disputes;
DROP POLICY IF EXISTS disputes_update ON disputes;
DROP POLICY IF EXISTS disputes_delete ON disputes;

CREATE POLICY disputes_select ON disputes
  FOR SELECT USING (
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

CREATE POLICY disputes_insert ON disputes
  FOR INSERT WITH CHECK (
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

CREATE POLICY disputes_update ON disputes
  FOR UPDATE USING (
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

CREATE POLICY disputes_delete ON disputes
  FOR DELETE USING (
    org_id = auth_org_id() AND (
      auth_role() = 'manager' OR
      raised_by = auth.uid()
    )
  );

-- 6. Audit Events RLS (manager only for read, org members can insert)
DROP POLICY IF EXISTS audit_select ON audit_events;
DROP POLICY IF EXISTS audit_insert ON audit_events;

CREATE POLICY audit_insert ON audit_events
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY audit_select ON audit_events
  FOR SELECT USING (org_id = auth_org_id() AND auth_role() = 'manager');

