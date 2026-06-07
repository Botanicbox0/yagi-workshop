-- P0-2: public-share identity binding + append-only action audit.
--
-- Closes the "anyone with the share link can sign off as any email" gap:
--   1) Bind a share to an intended recipient email captured at share-enable
--      time. The approve/review route handlers accept a write only when the
--      caller's claimed email matches the bound recipient (case-insensitive).
--      Legacy/blank shares (recipient NULL) are accepted but audited
--      (binding simply not enforced) so in-flight client approvals do not break.
--   2) Record every approve/review attempt (accepted OR rejected) in an
--      append-only audit table readable only by yagi_admin (written via the
--      service role from the route handlers, which bypasses RLS).

-- 1) Recipient binding columns (nullable; legacy shares remain unbound).
ALTER TABLE public.preprod_boards
  ADD COLUMN IF NOT EXISTS share_recipient_email text NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deliverable_share_recipient_email text NULL;

-- 2) Append-only audit of public-share write actions.
CREATE TABLE IF NOT EXISTS public.share_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL,
  action text NOT NULL,
  target_id uuid NOT NULL,
  deliverable_id uuid NULL,
  token_hash text NOT NULL,
  decision text NULL,
  claimed_email text NULL,
  recipient_email text NULL,
  recipient_matched boolean NOT NULL,
  accepted boolean NOT NULL,
  ip text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT share_action_audit_surface_check
    CHECK (surface IN ('board', 'deliverable')),
  CONSTRAINT share_action_audit_action_check
    CHECK (action IN ('approve', 'review')),
  CONSTRAINT share_action_audit_decision_check
    CHECK (decision IS NULL OR decision IN ('approved', 'changes_requested'))
);

CREATE INDEX IF NOT EXISTS share_action_audit_target_idx
  ON public.share_action_audit(surface, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS share_action_audit_created_idx
  ON public.share_action_audit(created_at DESC);

ALTER TABLE public.share_action_audit ENABLE ROW LEVEL SECURITY;

-- yagi_admin read-only. Writes go through the service role (RLS-bypassing)
-- from the share route handlers, so no INSERT/UPDATE/DELETE policies are
-- granted: the table is effectively append-only and admin-readable from the app.
DROP POLICY IF EXISTS share_action_audit_admin_select ON public.share_action_audit;
CREATE POLICY share_action_audit_admin_select
ON public.share_action_audit
FOR SELECT
TO authenticated
USING (public.is_yagi_admin(auth.uid()));

COMMENT ON TABLE public.share_action_audit IS
  'P0-2: append-only audit of public-share write actions (approve/review): claimed identity, recipient match, IP/UA. yagi_admin read-only; written via service role.';
COMMENT ON COLUMN public.preprod_boards.share_recipient_email IS
  'P0-2: intended client email this board share is bound to. approve accepts only a matching client_email (case-insensitive). NULL = legacy/unbound (accepted but audited).';
COMMENT ON COLUMN public.projects.deliverable_share_recipient_email IS
  'P0-2: intended client email this deliverable share is bound to. review accepts only a matching reviewer_email (case-insensitive). NULL = legacy/unbound (accepted but audited).';
