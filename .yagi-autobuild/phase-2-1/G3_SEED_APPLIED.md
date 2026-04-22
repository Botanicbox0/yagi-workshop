# Phase 2.1 G3 — yagi-internal seed migration: APPLIED

**Date:** 2026-04-23
**Status:** DONE
**Migration:** `supabase/migrations/20260423020100_seed_yagi_internal_workspace.sql`
**Applied via:** `mcp__claude_ai_Supabase__apply_migration`
**Target:** `jvamvbpxnztynsccvcmr` (yagi-workshop)

---

## What this closes

Phase 2.0 G7 Codex K-05 flagged as an "external prerequisite" that the `workspaces` row with `slug='yagi-internal'` was required by:
- `preprod_boards_set_workspace_id` trigger (hard `slug='yagi-internal'` lookup; raises `yagi-internal workspace not found` if missing).
- `is_yagi_internal_ws(wsid)` predicate used by team_channels RLS and related yagi-only surfaces.

The row existed in live `jvamvbpxnztynsccvcmr` from a manual Phase 1.1 bootstrap, but no authoritative migration seeded it — clean-clone `supabase db reset` would silently leave preprod and team-chat paths broken.

## Live row captured

```
id:            320c1564-b0e7-481a-871c-be8d9bb605a8
name:          YAGI Internal
slug:          yagi-internal
plan:          custom
brand_guide:   {}
created_at:    2026-04-21 16:43:37.400462+00 (manual bootstrap; preserved in live)
```

Optional / NULL-carrying columns on the live row (logo_url, tax_id, tax_invoice_email, business_registration_number, representative_name, business_address, business_type, business_item): omitted from the seed INSERT — they default to NULL and are populated per-deployment if ever needed. `updated_at` lets its `DEFAULT now()` fire on fresh inserts.

## Migration shape

```sql
INSERT INTO public.workspaces (id, name, slug, plan, brand_guide)
VALUES (
  '320c1564-b0e7-481a-871c-be8d9bb605a8',
  'YAGI Internal',
  'yagi-internal',
  'custom',
  '{}'::jsonb
)
ON CONFLICT DO NOTHING;
```

Constraints consulted for idempotency design:
- `workspaces_pkey` — PRIMARY KEY (id)
- `workspaces_slug_key` — UNIQUE (slug)

`ON CONFLICT DO NOTHING` handles either conflict class. Against live DB (id + slug both collide) the statement is a silent no-op; on a clean clone it inserts fresh.

## Apply result

- MCP apply_migration: `{"success": true}`
- Post-apply row check: single row with id `320c1564-b0e7-481a-871c-be8d9bb605a8`, values unchanged (slug_row_count = 1).
- Version alignment: `schema_migrations.version = '20260423020100'` matches disk filename timestamp (G5/G2 pattern).

## Verification against clean clone

Out of scope for this session (no local Docker / fresh-DB environment). The migration is structurally equivalent to a manual `INSERT ... ON CONFLICT DO NOTHING` and has been validated as a no-op against the canonical live state; a future `supabase db reset` in a different environment is the remaining proof.

## Downstream doc updates

- `.yagi-autobuild/contracts.md` — Phase 1.4 "Reads" section rewritten: yagi-internal row is now "seeded by migration ..." instead of "external prerequisite, manually inserted".
- `.yagi-autobuild/contracts.md` — "Known gaps / External prerequisites" section marks the prerequisite as **(resolved 2026-04-23 Phase 2.1 G3)** with a strikethrough reference.

## Auto-advance condition

SPEC §2 success criterion: `workspaces.slug='yagi-internal'` seeded by a migration, not a manual prerequisite — **PASSED.**

Advancing to G4 (POPBILL `issueTaxInvoice()` guard hardening).
