# Phase 2.2 — Backlog

**Seeded:** 2026-04-23 by Phase 2.1 G5 triage.
**Taxonomy refresh:** 2026-04-23 (post Phase 2.1 G5 FIX_NOW). `DEFER_TO_2_2` split into:
- **DEFER_PHASE_2_5** — pullable in the next (Phase 2.5 MVP) sprint; bounded scope, no shared-primitive / architectural / design-decision blocker.
- **DEFER_PHASE_3** — blocked on a shared decision (new primitive, architecture change, design ADR) that has to land before the item can be expedited.
- **WONTFIX** — invariant is already sufficient; no action.
**Source:** `.yagi-autobuild/phase-2-0/G4_TRIAGE.md` §DEFER_TO_2_1 + Phase 2.1 G5 classifications (`G5_TRIAGE_RESULT.md`).
**Contract:** items below need scoping before they enter a phase SPEC. Priority ordering is rough (severity × ease); CEO retains right to reorder at SPEC-time.

---

## DEFER_PHASE_2_5 (14 items — pullable into the next MVP sprint)

### Top of list — carry-overs from Phase 2.1 G5 (dropped from FIX_NOW at cap=3)

| Phase | ID | Description | Why top-of-list |
|-------|----|-------------|-----------------|
| 1.6 | M1 | OG image `force-dynamic` (no cache) — implement 1h `s-maxage` or `unstable_cache` | Perf + Vercel bandwidth cost; bounded once cache strategy chosen. Was Phase 2.1 G5 runner-up. |
| 1.7 | M2 | `success_channel_unarchived` toast key missing | Trivial (~5 min); fastest Phase 2.5 kick-off item. Was Phase 2.1 G5 runner-up. |
| 1.6 | M3 | `robots.txt` metadata route | Folds into a new Phase 2.5 bundle **"SEO + meta standardization: robots.txt + sitemap.xml + OG image defaults"** — was Phase 2.1 G5 FIX_NOW #5 candidate, deferred when FIX_NOW cap reduced to 3. |

### UX / realtime / reliability polish

| Phase | ID | Description | Why deferred |
|-------|----|-------------|--------------|
| 1.2.5 | M2 | Realtime attachments need reload to appear | Client-side refetch hook; complementary to Phase 2.1 G2 publication fix |
| 1.2.5 | L1 | Attachment signed URLs expire mid-stream | `onError` re-sign state machine |
| 1.2.5 | L2 | pdfjs worker on jsDelivr lacks SRI | Self-host the worker (SRI on jsDelivr breaks silent upgrades) |
| 1.3 | M2 | Stale `pending` meetings unrecoverable | Retry/cleanup cron job (new Edge Function + schedule) |
| 1.3 | M4 | Fallback ICS retries resend duplicate emails | Invite-send-state column + idempotency key; DB migration |
| 1.4 | L1 | Reaction bucket name mismatch (`hand` vs `needs_change`) | Rename cascade across DB CHECK + code + i18n; migration required |
| 1.4 | L2 | Click same reaction twice shows false "undo" | UX polish |
| 1.6 | M2 | Content Collections config deprecated | Migrate to `content` property; bounded refactor but touches MDX pipeline |

### Cosmetic / dead-code batches

| Phase | ID | Description | Why deferred |
|-------|----|-------------|--------------|
| 1.6 | L1–L13 | Dead i18n / feed / MDX links / OG quote split / WCAG (13 sub-items) — **now also includes Phase 1.3 L1 `blockquote dead code in meeting-template.ts`** per Phase 2.1 G5 merge | Catch-all cosmetic dead-code batch across phases; re-audit first — some may already be resolved by Phase 2.0 G6 |
| 1.7 | L1–L14 | Realtime cross-tab, orphan uploads, unused keys, a11y, signed URL TTL (14 sub-items) | Polish batch; re-audit before pulling |

---

## DEFER_PHASE_3 (6 items — blocked on design decision / new primitive / architecture change)

| Phase | ID | Description | Blocker |
|-------|----|-------------|---------|
| 1.2 | M2 | Internal thread messages writable via direct API | RLS WRITE tightening + design decision (who can post `visibility='internal'` — yagi_admin only? all workspace_admin?) |
| 1.2 | M5 | `/api/unfurl` no rate limit | Rate-limit primitive ADR (in-memory per-instance vs Upstash vs DB-backed token bucket) |
| 1.4 | M2 | Preprod visibility too loose (any ws_member of yagi-internal) | Design decision — who can see preprod boards |
| 1.4 | M3 | Reaction UPSERT identity spoofable (email from body) | Session-token binding architecture change |
| 1.5 | M2 | Email print URL hardcoded to `/ko/` | Buyer-locale model (where does the buyer's preferred locale live?) |
| 1.5 | L2 | No rate limit on `fetchSuggestions` | Same rate-limit primitive ADR as 1.2 M5 |

**Shared blocker** — the `/api/unfurl` (1.2 M5) and `fetchSuggestions` (1.5 L2) rate-limit items both wait on one ADR: **which rate-limit primitive does the project adopt?** (In-memory per-instance, Upstash Redis, Supabase-backed token bucket, Vercel edge-config.) Phase 2.5 or 2.6 should pick one and backfill both items atomically.

---

## WONTFIX (1 item)

| Phase | ID | Description | Justification |
|-------|----|-------------|---------------|
| 1.5 | L1 | `suggestLineItems` no dedup by `source_type` | Cosmic-risk UUID collision (~2⁻¹²² per batch). Existing `source_type` enum discriminator already differentiates `meeting` / `storyboard` / `deliverable` / `manual` rows; collision probability is negligible against the discriminator. No action. |

---

## Infra seed migrations (missing from baseline)

Pattern: resources live in production DB but have no authoritative SQL migration.
Breaks `supabase db reset` reproducibility.

### Items

**1. pg_cron job `notify-dispatch`**
- State: live only. Schedule `*/10 * * * *`, calls Edge Function notify-dispatch.
- Impact on clean clone: job absent → notifications never dispatched in fresh env.
- Fix shape: migration with `SELECT cron.schedule('notify-dispatch', '*/10 * * * *', $$...$$);`
  after pg_cron CREATE EXTENSION in baseline.
- Discovered: Phase 2.1 G1 investigation (2026-04-23)

**2. workspaces.slug='yagi-internal' seed**
- State: resolved in Phase 2.1 G3.
- Listed here for pattern documentation only.

### Phase 2.2 scope proposal (tentative)
"Infra seed consolidation" mini-phase. Audit all live DB state vs migrations.
Candidates to check:
- pg_cron jobs (done above, 1 found)
- Vault secrets (service_role reference in cron auth — is it seeded?)
- Storage buckets + policies
- Auth email templates
- RLS policy drift vs migration files

---

## Housekeeping when the next phase kicks off

1. Re-sort by that phase's scope themes (feature work vs. backlog burndown).
2. `DEFER_PHASE_3` items need CEO consultation / ADR before they can be expedited; don't pull straight into a SPEC without resolving the blocker.
3. The **rate-limit primitive ADR** (1.2 M5 / 1.5 L2 prerequisite) is its own standalone work item — treat as ADR before any rate-limit fix lands.
4. Cosmetic batches (`1.6 L1–L13`, `1.7 L1–L14`) should be re-audited against current `src/` — some sub-items may already be dead due to Phase 2.0 G6 cleanup.
5. The bundle name **"SEO + meta standardization: robots.txt + sitemap.xml + OG image defaults"** is pre-reserved for Phase 2.5 SPEC-time; `1.6 M1` (OG cache) and `1.6 M3` (robots.txt) belong to it.

---

**Count reconciliation:** DEFER_PHASE_2_5 = 14 (12 from G5 + 2 runners-up 1.3 L1 merged into 1.6 L1-L13 batch and 1.6 M3 as standalone) + DEFER_PHASE_3 = 6 + WONTFIX = 1 ⇒ **21 rehomed items** (was 18 after original FIX_NOW=5; with FIX_NOW=3 cap, 2 more dropped here). Adds infra seed 1 (the cron job is a NEW discovery, not a G4_TRIAGE item).
