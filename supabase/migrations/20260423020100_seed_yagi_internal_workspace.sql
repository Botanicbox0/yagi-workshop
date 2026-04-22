-- Phase 2.1 G3 — seed yagi-internal workspace row.
--
-- Why this exists as a seed, not derived:
--   - preprod_boards_set_workspace_id trigger does a hard lookup of
--     `slug='yagi-internal'` and raises "yagi-internal workspace not found"
--     if the row is missing (see baseline migration line 236-238).
--   - is_yagi_internal_ws(wsid) predicate (RLS for team_channels, etc.)
--     compares workspace_id against the yagi-internal id at query time —
--     no row means no yagi-internal authorization surface exists.
--
-- The row exists in the live jvamvbpxnztynsccvcmr project from a manual
-- Phase 1.1 bootstrap insert (2026-04-21 16:43 UTC). No authoritative
-- migration seeded it, so a clean clone + `supabase db reset` would fail
-- preprod/team-chat paths until operator hand-ran an INSERT. This migration
-- promotes the row from "operational prerequisite" (contracts.md §Known
-- external prerequisites) to "seeded artifact".
--
-- Idempotency: ON CONFLICT DO NOTHING handles conflict on either the PK
-- (id) or the UNIQUE (slug) index — live DB (where both already match)
-- silently no-ops; clean-clone inserts fresh. Values replicate the live
-- row exactly so downstream joins (workspace_members.workspace_id,
-- projects.workspace_id, etc.) find the same id everywhere.

INSERT INTO public.workspaces (
  id,
  name,
  slug,
  plan,
  brand_guide
) VALUES (
  '320c1564-b0e7-481a-871c-be8d9bb605a8',
  'YAGI Internal',
  'yagi-internal',
  'custom',
  '{}'::jsonb
)
ON CONFLICT DO NOTHING;
