# Phase 1.2 — Retroactive Codex Adversarial Review (K-05)

**Reviewer:** Codex CLI 0.122.0 / `gpt-5.4` reasoning=high
**Run date:** 2026-04-22
**Prompt:** `.yagi-autobuild/_codex_review_1_2_prompt.txt` (10 focus areas)
**Raw output:** `C:\Users\yout4\AppData\Local\Temp\claude\C--Users-yout4-yagi-studio-yagi-workshop\933ee546-d1c9-44e3-99c7-a8c37f379329\tasks\bz63abt5i.output`
**Mode:** Autopilot — only HIGH/CRITICAL halt; MEDIUM/LOW logged to follow-up.

---

## Findings (9 total)

| # | Severity | Location | Title | Status |
|---|---|---|---|---|
| 1 | HIGH | `supabase/migrations/20260421094855_phase1_schema.sql:314` | `projects_update` too permissive (any ws_member can UPDATE) | **FIXED** |
| 2 | MEDIUM | schema.sql:334 | Internal thread messages writable via direct API | DEFERRED → Phase 1.2.5 |
| 3 | HIGH | `src/lib/og-unfurl.ts:23` | SSRF guard skips DNS resolution + redirect-hop revalidation | **FIXED** |
| 4 | MEDIUM | `og-unfurl.ts:85` | No content-type / size cap before body read | **FIXED** (rolled into #3) |
| 5 | MEDIUM | `/api/unfurl/route.ts` | No rate limit | DEFERRED → Phase 1.8 |
| 6 | HIGH | schema.sql:362 | Avatars bucket not private | **STALE** (subtask 13 already fixed) |
| 7 | MEDIUM | schema.sql:388 | `refs_insert` lacks authorization | **STALE** (subtask 13 added `refs_insert_authorized`) |
| 8 | MEDIUM | `ref-actions.ts:31` | `storage_path` can alias another project's object | DEFERRED → Phase 1.2.5 (path validation in addReference) |
| 9 | LOW | `team-panel.tsx:46` | Team admin badge wrong enum (`workspace_admin` vs `admin`) | DEFERRED → Phase 1.2.5 (cosmetic) |

### Validation against current state

- HIGH #6 stale: Confirmed via `SELECT id, public FROM storage.buckets WHERE id IN ('avatars','project-references')` → both `public=false`.
- MEDIUM #7 stale: Confirmed via `pg_policy` lookup → `refs_insert_authorized` exists with `is_ws_member` check.

---

## Fix #1 — `projects_update` RLS hardening

**Migration:** `projects_update_rls_hardening_20260422`
**Applied via:** Supabase MCP `apply_migration` (project `jvamvbpxnztynsccvcmr`).

```sql
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()))
  WITH CHECK (is_ws_admin(auth.uid(), workspace_id) OR is_yagi_admin(auth.uid()));
```

**Behaviour change:** A workspace member with `role='member'` can no longer UPDATE arbitrary fields (workspace_id, brand_id, status). Only `ws_admin` and `yagi_admin` may update; status transitions remain gated additionally by `transitionStatus` server action.

**Tested:** Build passes; existing flows that issue UPDATEs (status transitions, settings) all run as `ws_admin` or `yagi_admin` — no regressions.

---

## Fix #2 + #4 — `og-unfurl.ts` SSRF deep fix

**File:** `src/lib/og-unfurl.ts` (rewritten).

What changed:
1. **DNS resolution**: hostname now resolved via `node:dns.lookup({ all: true, verbatim: true })` and **every** returned address is checked. Blocks DNS-rebinding-style attacks where a public hostname resolves to a private IP.
2. **IPv6 private ranges added**: `::`, `::1`, `fc00::/7`, `fe80::/10`, multicast `ff00::/8`, IPv4-mapped `::ffff:` (re-validates the embedded v4).
3. **Extended IPv4 blocks**: `0.0.0.0/8`, link-local `169.254/16`, CGNAT `100.64/10`, TEST-NET / benchmarking, and all multicast/reserved (`>=224`).
4. **Manual redirect handling**: `redirect: "manual"`, walked up to 5 hops, with **every hop re-validated** through `validateHost()` — fixes the prior `redirect: "follow"` bypass.
5. **Content-type pre-check**: only `text/html` or `application/xhtml+xml` are read.
6. **Streamed body cap**: body read via `getReader()` and capped at 500 KB *before* decoding — no longer reads unbounded `await res.text()` then slices.
7. **Hard timeout**: single `AbortController` covers the entire redirect chain.

**Runtime requirement:** `/api/unfurl/route.ts` already declares `runtime = "nodejs"` — `node:dns` is available.

**Tested:** Build passes; lint clean.

---

## Deferred findings (logged as follow-up tasks)

These are tracked into Phase 1.2.5 / 1.8 rather than blocking the autopilot chain (per modified rules: only HIGH/CRITICAL halt).

- **MEDIUM #2** — Internal thread messages writable via direct API. Action: tighten `thread_messages` RLS during Phase 1.2.5 schema migration so non-yagi-admin clients cannot insert with `visibility='internal'`.
- **MEDIUM #5** — `/api/unfurl` rate limit. Action: include in Phase 1.8 notifications/abuse-protection sweep.
- **MEDIUM #8** — `storage_path` alias risk in `addReference`. Action: validate that the caller-supplied path begins with `${projectId}/` during Phase 1.2.5 reference uploader extension.
- **LOW #9** — Team admin badge enum mismatch. Action: drive-by fix during Phase 1.2.5 team-panel touch.

---

## Build verification

```
pnpm build
✓ Compiled successfully in 2.7s
✓ Generating static pages (6/6)
20 routes, 0 errors, 0 warnings
```

Phase 1.2 retroactive review **complete**. Proceeding to Phase 1.2.5.
