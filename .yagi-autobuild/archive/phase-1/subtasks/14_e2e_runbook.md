# Subtask 14 — E2E manual test runbook (build + summary handled by Builder)

**status:** pending
**assigned_to:** executor_haiku_45
**created:** 2026-04-21
**parallel_group:** F (final)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 14"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or other subtask/result/feedback files.
3. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
4. Allowed tools: Write, Read, Glob, Grep.
5. **You are the runbook author only.** Do NOT run `pnpm build`. Do NOT write `.yagi-autobuild/summary.md`. Do NOT send any Telegram. The Builder handles those (each is gated by a separate kill-switch).
6. If you need info not in this subtask spec, write `BLOCKED: <reason>` and stop.

## Single deliverable

Create `.yagi-autobuild/phase-1-2-e2e.md` — a manual end-to-end smoke runbook the user can follow in a browser to verify Phase 1.2 features end-to-end.

## Required structure (sections, in order)

1. **Header** — title, generated date (2026-04-21), prerequisites
2. **Prerequisites** — `pnpm dev` running on :3001, two test accounts available (one yagi_admin, one regular workspace member), Resend API key set
3. **Test 1 — Create project** (brief form, submit)
4. **Test 2 — Reference collector** (2 image uploads + 1 Instagram URL with OG parse)
5. **Test 3 — Thread conversation** (client sends → YAGI admin sees in admin view → admin replies internal, client doesn't see → admin replies shared, client sees + email)
6. **Test 4 — Status transitions** (YAGI admin: submitted → in_discovery → in_production; client: approve / request_revision only when status is delivered)
7. **Test 5 — Settings** (avatar upload, workspace logo placeholder, tax_id field)
8. **Test 6 — RLS sanity** (delete cookies, GET `/rest/v1/projects` → empty / 401)
9. **Appendix — Routes reference** (concise list of all `/[locale]/app/*` routes added in Phase 1.2)
10. **Appendix — Known gaps** (carry over from `checkpoint.md` so the user does not flag deferred items as bugs)

## Per-test format

Use this exact structure for each Test section:

```markdown
### Test N — <name>

**Goal:** <one sentence>

**Steps:**
1. <action>
2. <action>
3. <action>

**Expected:**
- <observable result 1>
- <observable result 2>

**RLS / data check:** (when applicable)
- <SQL or anon-fetch sanity check>

**If it fails, look here:** <file path or table name>
```

## Content guidance

### Test 1 — Create project
- Sign in as a regular workspace member.
- Navigate `/{locale}/app/projects` → click "New project".
- 3-step wizard: pick `direct` or `contest` → fill brief (title required, brief text optional, tone is a ghost field) → submit.
- Expected: redirect to `/{locale}/app/projects/{id}`, status badge shows `submitted` (or `draft` depending on which CTA was used; document both), entry appears at top of `/projects` list.
- Data check: `SELECT id, title, status, workspace_id, created_by FROM projects ORDER BY created_at DESC LIMIT 1;`

### Test 2 — Reference collector
- Open the project detail page.
- Reference uploader has two tabs: **Image** and **URL**.
- Image tab: drag-drop OR click to upload 2 files (jpeg/png/webp/gif, ≤10 MB).
- URL tab: paste an Instagram (or any public) URL → server hits `/api/unfurl` → og_title / og_image_url populate the card.
- Expected: 3 reference cards render in the grid; image cards display via signed URL (1h expiry), URL card shows OG title + thumbnail.
- Data check: `SELECT id, kind_inferred, og_title, storage_path, added_by FROM project_references WHERE project_id = '<id>';` (note: there is no `kind` column — type is inferred at runtime by presence of `storage_path` vs `url`)

### Test 3 — Thread conversation
- As regular member: open project → "Thread" panel → type a message → send. Visibility toggle should NOT be visible (yagi_admin only).
- As yagi_admin: navigate `/{locale}/app/admin/projects` → click the project → see the message. Visibility toggle is visible.
- Send an **internal** reply (toggle off "shared with client") → as the regular member, refresh: message must NOT appear (RLS RESTRICTIVE policy).
- Send a **shared** reply → regular member sees it via Realtime (or refresh). Resend email arrives at the member's address (subject + bilingual body keyed to `profiles.locale`).
- RLS sanity: as the regular member, attempt `SELECT * FROM thread_messages WHERE visibility='internal' AND thread_id IN (...)` — must return 0.

### Test 4 — Status transitions
- yagi_admin transitions: `submitted` → `in_discovery` → `in_production` (one-way per ALLOWED map; document the map).
- Member transitions: only when status is `delivered` can member press `approve` (→ `approved`) or `request_revision` (→ `in_revision`).
- Expected: invalid transitions are not surfaced as buttons; if attempted via direct call, server action returns `{ error: "invalid_transition" }`.

### Test 5 — Settings
- Navigate `/{locale}/app/settings`.
- Profile tab: change display name → toast confirms → reload reflects. Upload avatar (jpeg/png/webp ≤5 MB) → image renders via signed URL in the form preview AND in sidebar after page reload.
- Workspace tab (ws_admin only): change workspace name + tax_id; logo field shows "Coming soon" (`dashboard.coming_soon` key).
- Team tab (ws_admin only): list shows current members; invite form returns `{ error: "not_implemented" }` toast (deferred).
- RLS check: a regular (non-ws_admin) member should be redirected away from workspace + team tabs at the layout level.

### Test 6 — RLS sanity
- In a fresh incognito window with no cookies:
  - `curl https://<your-supabase-host>/rest/v1/projects -H "apikey: <anon-key>"` → expect empty array `[]` (not an error, but zero rows).
  - `curl https://<your-supabase-host>/rest/v1/project_references -H "apikey: <anon-key>"` → empty.
  - `curl https://<your-supabase-host>/rest/v1/thread_messages -H "apikey: <anon-key>"` → empty.
- Avatars bucket: try to fetch a known avatar storage path WITHOUT a signed URL → expect 400/403 (bucket is now private after subtask 13).
- project-references bucket: same — no public access, signed URLs only.

### Appendix — Routes reference
List the new routes added in Phase 1.2:
- `/{locale}/app/projects` — list
- `/{locale}/app/projects/new` — 3-step wizard
- `/{locale}/app/projects/[id]` — detail (refs + thread + status)
- `/{locale}/app/admin/projects` — yagi_admin cross-workspace list
- `/{locale}/app/settings` — profile / workspace / team
- `/api/unfurl` — OG metadata endpoint (POST)

### Appendix — Known gaps (copy from checkpoint.md)
- Caption editing on reference cards (Phase 1.3)
- "Coming soon" placeholders on dashboard milestones panel
- `tone` form field present but no DB column yet
- Workspace logo upload UI deferred (bucket exists)
- Workspace invitation send deferred (`{ error: "not_implemented" }`)
- No email digest / retry queue (direct send only)

## Acceptance criteria

- File exists at `.yagi-autobuild/phase-1-2-e2e.md`.
- All 6 Test sections present, in order, using the per-test format above.
- Both Appendices present.
- File length 200–400 lines (concise but actionable).
- No hardcoded UI string assertions that don't match `messages/ko.json` / `en.json` — when referencing a label, write it as "the X CTA" not the literal text.

## Result file (`results/14_e2e_runbook.md`)

```markdown
# Subtask 14 result
status: complete
files_created: [.yagi-autobuild/phase-1-2-e2e.md]
length_lines: <N>
sections_present: [Header, Prerequisites, Test 1, Test 2, Test 3, Test 4, Test 5, Test 6, Routes appendix, Known gaps appendix]

## Notes
<any deviations from spec, e.g., scope-cuts or assumptions made>
```

Stop after writing the result file. Do NOT run `pnpm build`. Do NOT write `summary.md`. Do NOT send Telegram. Builder handles those steps with separate kill-switches.
