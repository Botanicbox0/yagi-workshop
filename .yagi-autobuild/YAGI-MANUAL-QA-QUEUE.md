# Yagi Manual QA Queue

**Created:** 2026-04-23 (Phase 2.1 overnight autopilot)
**Purpose:** Browser-side smokes that can't be automated from Claude Code (no headless browser + session auth). Non-blocking for Phase 2.1 closeout; 야기 runs these on wake.

Each entry: preconditions, steps, expected, code-path reference.

---

## Phase 2.1 G6 items (deferred from QA_SMOKE.md)

### Item 1 — Journal locale toggle

- **Preconditions:** Dev server running (`:3003`); visit a journal article, e.g. `/ko/journal/welcome-to-yagi-workshop`.
- **Steps:**
  1. Open the page in KO locale.
  2. Scroll to footer; click the locale toggle link (reads `EN`).
  3. Expect navigation to `/en/journal` (journal index, not `/en/journal/welcome-to-yagi-workshop` which may not have an EN twin).
- **Expected:** no 404. Lands on journal index in the other locale.
- **Code path:** `src/components/home/site-footer.tsx` `toggleHref = isJournalArticle ? "/journal" : normalizedPath` (Phase 2.0 G4 #7, commit `decaa8c`).

### Item 2 — Timezone save

- **Preconditions:** Signed in; visit `/ko/app/settings/notifications` (or /en equivalent).
- **Steps:**
  1. Change the timezone `<select>` from current value to e.g. `America/Los_Angeles`.
  2. Click Save.
  3. Reload the page.
- **Expected:** saved value persists; no error toast; dev console shows no errors.
- **Code path:** shared `TIMEZONES` allowlist at `src/lib/notifications/timezones.ts`; `z.enum(TIMEZONES)` in both server action schema (`actions.ts`) + client form (`prefs-form.tsx`). Phase 2.0 G4 #3 (commit `614312e`).

### Item 3 — Invoice draft 404

- **Preconditions:** Signed in as yagi_admin; have at least one invoice with `status='draft'` in the DB.
- **Steps:**
  1. Navigate to `/ko/app/invoices/<draft-id>/print`.
- **Expected:** HTTP 404 (Next.js not-found), not a rendered draft print page.
- **Code path:** early `notFound()` guard at `src/app/[locale]/app/invoices/[id]/print/page.tsx:70-75` on `invoice.status === "draft"`. Phase 2.0 G4 #9 (commit `ade2cb0`).

### Item 6 — YouTube Shorts embed end-to-end

- **Preconditions:** Signed in as yagi_admin; an existing showcase with at least one `video_embed` media item.
- **Steps:**
  1. Use the admin editor to add a video-embed media with a Shorts URL like `https://www.youtube.com/shorts/dQw4w9WgXcQ`.
  2. Publish the showcase.
  3. View the public page at `/showcase/<slug>`.
- **Expected:** the iframe resolves to `https://www.youtube.com/embed/dQw4w9WgXcQ`, not `/shorts/`. Video plays.
- **Code path:** `buildEmbedUrl()` at `src/app/showcase/[slug]/page.tsx:142-160` `.replace(/\/shorts\//, "/embed/")`. Phase 2.0 G6 L4 (commit `ef3e24c`). Route reachable post middleware fix `5855dd0`.

---

## Phase 2.1 queue (accrued during this phase)

### Q-G2 — Preprod feedback realtime (two-tab live update)

- **Preconditions:** Two browser sessions (or tabs) with access to a shared preprod board share page `/s/<token>`.
- **Steps:**
  1. Tab A: react (emoji bucket) or comment on a frame.
  2. Tab B: observe reaction count / comment appearing without reload.
- **Expected:** update arrives <1 s. If not — re-run `pg_publication_tables` query + check browser websocket.
- **Code path:** `src/components/preprod/board-editor.tsx:1007-1041` postgres_changes subscription. Phase 2.1 G2 publication fix (commit `4bf7591`, migration `20260423020000_h1_preprod_realtime_publication`).

### Q-G4 — POPBILL guard toast i18n

- **Preconditions:** Signed in as yagi_admin; a draft invoice; `.env.local` has `POPBILL_MODE=test` (current state).
- **Steps:**
  1. Open the draft invoice detail page.
  2. Click **Issue** (발행).
- **Expected:** red Sonner toast saying "발행에 실패했습니다" with description "팝빌 실발행 경로는 아직 연결되지 않았습니다…" (ko) or "The live Popbill issuance path isn't wired up yet. SDK integration lands in Phase 2.2…" (en). Dev server stdout logs `[invoices] issueInvoice guarded — popbill path deferred { phase: "2.2", mode: "test", intent: "issueTaxInvoice" }`. NO "NOT_IMPLEMENTED" raw string in the UI.
- **Code path:** Phase 2.1 G4 (commit `cc02bce`) — `src/lib/popbill/client.ts`, `src/app/[locale]/app/invoices/[id]/actions.ts`, `src/components/invoices/invoice-editor.tsx`, `messages/{ko,en}.json`.

### Q-G5 — Meeting+attendees transaction rollback

- **Preconditions:** Signed in as yagi_admin; a project you admin.
- **Steps:**
  1. Via the admin DB console (or by manipulating the attendee form), attempt to submit a meeting with TWO identical attendee emails — which would violate the `(meeting_id, email)` UNIQUE constraint.
  2. Observe that NO new row appears in `meetings` (transaction rolled back).
- **Expected:** `createMeeting` returns `{ ok: false, error: 'db' }`; `meetings` table has no orphan row from this attempt.
- **Code path:** Phase 2.1 G5 FIX_NOW #2 (commit `7eb5686`) — `supabase/migrations/20260423020200_create_meeting_with_attendees_rpc.sql`, RPC `public.create_meeting_with_attendees`.

---

---

## Phase 2.5 G3 items

### Q-G3-C1 — Gallery realtime 2-browser smoke (5s SLA per SPEC §2 #6)

Phase 2.5 G3 gallery realtime 2-browser smoke (5s SLA per SPEC §2 #6):
- Open `/challenges/test-open-1/gallery` in 2 browser tabs.
- In Supabase SQL Editor: INSERT a new challenge_submission for test-open-1.
- Both tabs should refresh within 5s showing the new submission.
- If not: check browser console for postgres_changes subscription errors.

**Code path:** `src/components/challenges/gallery-realtime.tsx` — first realtime subscriber in codebase. Channel name: `gallery:<challengeId>`.

---

## Priority ordering (suggested)

Most business-visible first:
1. Q-G4 POPBILL guard — user-facing bilingual toast is the surface touched by the most recent shipping work.
2. Item 1 journal locale toggle — on every public page footer.
3. Q-G2 preprod realtime — used in every client feedback flow.
4. Item 2 timezone save — used on every digest email schedule.
5. Item 3 invoice draft 404 — admin-only but defense-in-depth.
6. Item 6 YouTube Shorts — single media kind under showcase.
7. Q-G5 meeting txn rollback — transactional behavior smoke, hard to accidentally trigger.

Log any FAIL back to `gates/phase-2-1/QA_SMOKE.md` (move the row back from PASS with note) so Phase 2.2 has the history.
