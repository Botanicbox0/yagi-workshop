# Phase 2.0 baseline — known limitations & Phase 2.1+ re-dump checklist

> **Status:** Acknowledged. Documented for transparency.
> **File:** `supabase/migrations/20260422120000_phase_2_0_baseline.sql`
> **Captured:** 2026-04-22 (Phase 2.0 G2)
> **Reason for imperfect baseline:** Phase 2.0 environment has no Docker. `supabase db dump --linked` requires Docker (it spins up a Postgres image to do a clean dump under a temporary login role). The Docker-free workaround was raw `pg_dump` against the pooler URL, which produced a usable but incomplete dump that needed manual supplementation.

---

## What `pg_dump v18 --schema=public,storage` correctly captured

- All 30 public-schema tables (CREATE TABLE definitions, columns, defaults, constraints, FKs)
- All 91 public indexes
- All 81 public RLS policies + all 27 storage RLS policies (108 total `CREATE POLICY` statements)
- All 12 public functions (29 CREATE FUNCTION counting storage-schema helpers)
- All 17 public triggers (21 counting storage-schema triggers)
- 8 storage-schema tables (buckets, buckets_analytics, buckets_vectors, migrations, objects, prefixes/iceberg_*, s3_multipart_uploads, s3_multipart_uploads_parts, vector_indexes)
- All sequences, types, domains used by public/storage

These match the pre-count and post-count SQL queries (zero diff between pre and post — no DDL drift during dump).

---

## What `pg_dump v18 --schema=public,storage` did NOT capture (manually supplemented)

`pg_dump` with `--schema=...` restriction excludes catalog-level objects that don't belong to a single schema. Three categories were missing and were added by Claude Code based on direct queries against `pg_extension`, `storage.buckets`, and `pg_publication_tables` on 2026-04-22:

### Supplement 1/2 — extensions (5 declared, 3 omitted)

Added at top of baseline.sql:

| extname             | schema      | extversion | rationale for inclusion                  |
|---------------------|-------------|------------|------------------------------------------|
| pg_cron             | pg_catalog  | 1.6.4      | Phase 1.8 cron tick for notify-dispatch  |
| pg_net              | public      | 0.20.0     | pg_cron → Edge Function HTTP             |
| pg_stat_statements  | extensions  | 1.11       | Supabase default observability           |
| pgcrypto            | extensions  | 1.3        | Used widely (UUID gen, hashing)          |
| uuid-ossp           | extensions  | 1.1        | Used in some defaults                    |

Intentionally **omitted** (Supabase-managed, baseline should not assert them):
- `plpgsql` (always present, pg_catalog)
- `pg_graphql` (Supabase-injected, version drifts)
- `supabase_vault` (Supabase-injected, requires vault schema bootstrap not in our control)

### Supplement 2/2 — storage bucket rows (10) + realtime publication members (3)

Added at bottom of baseline.sql (idempotent: `ON CONFLICT DO NOTHING` for buckets, existence-check `DO $$` block for publication membership).

**10 storage buckets** (live DB query 2026-04-22, sorted alphabetically):

| id                       | public |
|--------------------------|--------|
| avatars                  | false  |
| brand-logos              | true   |
| preprod-frames           | false  |
| project-deliverables     | false  |
| project-references       | false  |
| showcase-media           | false  |
| showcase-og              | true   |
| team-channel-attachments | false  |
| thread-attachments       | false  |
| workspace-logos          | true   |

> Note: only `(id, name, public)` columns are seeded. Other columns (owner, file_size_limit, allowed_mime_types, avif_autodetection, owner_id, type, created_at, updated_at) take Supabase defaults on a fresh DB. If Phase 1.x ever set non-default values for these (e.g., per-bucket size limits), they are NOT in this baseline. Verify via live query before relying.

**3 realtime publication members:**
- `public.notification_events` (Phase 1.8)
- `public.team_channel_messages` (Phase 1.7)
- `public.team_channel_message_attachments` (Phase 1.7)

---

## Other manual modifications to raw pg_dump output

1. **Stripped PG18 `\restrict` / `\unrestrict` psql meta-commands** (lines 5 + last) — these are PG18-only psql syntax that fails on PG17 server during apply.

2. **Softened `CREATE SCHEMA public;` / `CREATE SCHEMA storage;` to `CREATE SCHEMA IF NOT EXISTS`** — both schemas always exist on a Supabase project; raw dump output would conflict on apply.

3. **Stripped 38 `COPY ... FROM stdin` data blocks** containing live PII (user emails, phone, business registration numbers, message bodies, file paths, owner UUIDs). The default `pg_dump` (without `--schema-only`) emits both schema AND data; this baseline is schema-only by design, and committing live PII to a Git repo would be a serious leak. The data is not needed for the baseline's purpose (forensic + fresh-clone reproducer).

---

## Known pre-existing schema issue surfaced (not introduced) by baseline

**`recalc_invoice_totals`** is `SECURITY DEFINER` without `SET search_path` lockdown. 9 of 10 SECURITY DEFINER functions have explicit `search_path=public` (or equivalent); this trigger function from Phase 1.5 slipped. Fix belongs in **Phase 2.0 G5** (Phase 1.9 MEDIUM/HIGH triage) — NOT G2, because the baseline must mirror live DB exactly without papering over pre-existing flaws.

---

## What this means for fresh-clone reproducibility

This baseline, when applied to a brand-new Supabase project, will reproduce the Phase 1.9 schema with **high fidelity but not perfectly**. Confidence sources, in descending order:

1. **HIGH:** All tables, columns, constraints, FKs, indexes — `pg_dump` is authoritative.
2. **HIGH:** All RLS policies on public + storage — `pg_dump` is authoritative.
3. **HIGH:** All functions and triggers (public + storage helpers) — `pg_dump` is authoritative.
4. **MEDIUM:** Extensions — supplement based on `pg_extension` query at one point in time. Versions may drift in future Supabase upgrades; baseline will continue to work because of `IF NOT EXISTS`.
5. **MEDIUM:** Storage buckets — supplement based on live `storage.buckets` rows. Only id/name/public columns; per-bucket limits/MIME-type allowlists not in baseline. If Phase 1.x set non-default values, those are lost.
6. **HIGH:** Realtime publication membership — supplement based on live `pg_publication_tables` query at one point in time. Idempotent guards make it safe to re-run.

What this baseline **CANNOT** reproduce by design (intentionally not in scope):
- `auth` schema state (users, identities, sessions) — Supabase-managed
- `storage` schema state beyond bucket rows (objects, multipart uploads) — runtime data
- pg_cron schedules — those live in `cron.job` and were created by Phase 1.8 migrations applied via MCP. They re-execute on Edge Function side; for a true fresh clone, re-run the Phase 1.8 cron-bootstrap SQL manually.
- Vault secrets — captured outside DB schema (in Supabase Vault), not in pg_dump scope.

---

## Phase 2.1+ re-dump checklist (when Docker is available)

When a future phase has Docker (e.g., Phase 2.1 sets up CI, or Yagi adds Docker Desktop), redo the dump cleanly to retire this caveat document:

1. Capture pre-count using `g2_pre_baseline_counts.txt` query.
2. `supabase db dump --linked --schema public --schema storage -f /tmp/baseline_v2.sql` (with Docker running).
3. Compare `/tmp/baseline_v2.sql` against `supabase/migrations/20260422120000_phase_2_0_baseline.sql`:
   - Diff CREATE TABLE statements — should be identical or only formatting changes.
   - Diff CREATE POLICY statements — should be identical.
   - Diff function/trigger bodies — should be identical.
   - Verify storage bucket INSERT block in baseline matches actual bucket configuration (limits, MIME types).
   - Verify realtime publication ALTER block matches `pg_publication_tables`.
   - Verify CREATE EXTENSION block matches `pg_extension` (versions ok to differ).
4. If any divergence beyond formatting → overwrite `20260422120000_phase_2_0_baseline.sql` with the cleaner v2 dump (preserve the manual supplements section structure, just refresh the inner data).
5. Update this file: change Status to "Resolved by Phase 2.X clean re-dump on YYYY-MM-DD."
6. Capture post-count, diff, commit.

---

## Cross-refs

- `.yagi-autobuild/phase-2-0/SPEC.md` G2 (Option C migration baseline squash, Docker-free variant)
- `.yagi-autobuild/phase-2-0/g2_pre_baseline_counts.txt` (live DB Phase 1.9 state)
- `.yagi-autobuild/phase-2-0/g2_post_baseline_counts.txt` (live DB after dump — zero drift)
- `.yagi-autobuild/archive/migrations-pre-2-0/MISSING.md` (reconciliation of 22 historical migrations)
- `CLAUDE.md` "Migration list cosmetic mismatch" note (added in G2 Step 6)
