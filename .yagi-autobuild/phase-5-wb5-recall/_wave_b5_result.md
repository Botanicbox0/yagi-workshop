# Wave B.5 — Client Recall — Result

**Status**: Builder ships READY. Awaiting 야기 ff-merge GO.

## Diffs

### Files

| Type | Path |
|---|---|
| NEW migration | `supabase/migrations/20260504220000_phase_5_wb5_client_recall_to_draft.sql` |
| NEW server action | `src/app/[locale]/app/projects/[id]/recall-actions.ts` |
| NEW client component | `src/app/[locale]/app/projects/[id]/recall-button.tsx` |
| MODIFIED detail page | `src/app/[locale]/app/projects/[id]/page.tsx` (1 import + 1 conditional render block) |
| MODIFIED i18n | `messages/ko.json` (project_detail.recall block, 8 keys) |
| MODIFIED i18n | `messages/en.json` (project_detail.recall block, 8 keys) |
| NEW review docs | `.yagi-autobuild/phase-5-wb5-recall/_questions.md` (v1 halt — superseded) |
| NEW review docs | `.yagi-autobuild/phase-5-wb5-recall/_verify_log.md` |
| NEW review docs | `.yagi-autobuild/phase-5-wb5-recall/_codex_review_prompt.md` |
| NEW review docs | `.yagi-autobuild/phase-5-wb5-recall/_codex_review_loop1.md` |

### Path adaptations vs SPEC

SPEC v3 used `src/app/(authenticated)/projects/[id]/_actions/...` route-group
convention. Repo enforces `src/app/[locale]/app/projects/[id]/...` per
`CLAUDE.md` rule #7 (NOT `(app)` route group). Files placed under the
correct convention; no `_actions/` subdirectory created (existing siblings
like `actions.ts`, `board-actions.ts`, `ref-actions.ts` follow flat layout
— matched).

SPEC's `submitProjectAction.ts` filename does not exist; closest analog
is `submitBriefingAction` inside `briefing-step3-actions.ts` (Wave B
artifact). Mirrored its RPC-error-mapping shape for `recallProjectAction`.

i18n namespace SPEC says `projectDetail.recall.*` (camelCase). Existing
namespace is `project_detail.*` (snake_case). Followed repo convention →
nested under `project_detail.recall`.

## Verify log summary (1-13)

| Range | Steps | Result |
|---|---|---|
| Pre-apply | 1 (tsc) / 2 (lint) / 3 (build) | PASS |
| Migration apply | mcp `apply_migration` to prod | success |
| Post-apply SQL | 4 / 5 / 6 / 7 / 8 | PASS — matrix posture matches expected (`true/true/false/false/false`) |
| Manual smoke | 9 / 10 / 11 / 12 / 13 | ⏳ Pending 야기 browser smoke |
| K-05 LOOP 1 | 14 / 15 / 16 | **CLEAN** (Codex `gpt-5.5`, effort low, 34,705 tokens) |

Detail in `_verify_log.md`.

## K-05 result

- Verdict: **CLEAN**
- Findings: 0 HIGH / 0 MED
- Notes: 1 low-priority UX item flagged as Wave C/FU territory (NOT security):
  redirect target `/[locale]/app/projects/new?project={projectId}` does not
  hydrate the recalled draft (canvas reads sessionStorage, not query params).
  Tracked as **FU-Phase5-9** below.

## Open questions

None for security/state-machine. One UX gap captured as FU.

### FU-Phase5-9 — Briefing canvas query-param hydration for recalled drafts

- **Trigger**: K-05 LOOP 1 low-priority UX note. SPEC v3 §"RecallButton"
  spec'd redirect to `/projects/${projectId}/edit?step=commit` — that
  edit route does not exist in this repo. Builder substituted
  `/[locale]/app/projects/new?project={projectId}&step=commit`. The
  original `briefing-canvas.tsx` (Wave B) hydrated `projectId` from
  `sessionStorage` only; after recall the canvas opened empty, then
  the hotfix-6 defensive guard re-soft-deleted the just-recalled draft.
- **Resolution (Wave B.5 extension, commit `<HASH>`)**: closed inline
  via ~22 lines in `briefing-canvas.tsx`:
  - Imported `useSearchParams` from `next/navigation`.
  - Read `?project=` and `?step=` once at mount. `?project=` becomes
    the initial `projectId` state and overrides any stale
    `sessionStorage.projectId`. `?step=commit` / `?step=workspace`
    seed the initial `stage` (Step 3 / Step 2 respectively).
  - Action layer (`briefing-actions.ts`) untouched — passing a
    non-empty projectId steers `ensureBriefingDraftProject` into the
    UPDATE branch, which already validates `existing.status === 'draft'`
    and `existing.deleted_at IS NULL` from hotfix-6. Defensive
    soft-delete in the wipe path is naturally bypassed.
  - Step 3 component's existing on-mount fetch hydrates the commit
    form fields (budget / delivery / meeting / twin / notes) for the
    recalled draft.
- **Out-of-scope** (still deferred to Wave C if needed): Step 1 form
  prefill from DB when user navigates back from Step 3. Today the user
  who clicks [← 이전] all the way to Step 1 sees an empty form because
  sessionStorage was cleared on the original submit. zod validation on
  [다음 →] catches the empty submission with a toast — no data loss.
  Recall round-trip happy path (Step 3 edit + resubmit) is unaffected.
- **Owner**: Builder. Closed (round-trip happy path) in Wave B.5
  extension. Step-1-back-nav prefill remains a Wave C nicety.
- **Registered**: 2026-05-04. **Closed**: 2026-05-04 (extension commit).

## Ready-to-merge: **YES**

- Migration applied to prod, 5/5 SQL verify pass
- tsc / lint / build all clean
- K-05 CLEAN
- Open UX gap is documented FU, not blocker

ff-merge gate = 야기 chat GO + browser smoke (steps 9-13).
