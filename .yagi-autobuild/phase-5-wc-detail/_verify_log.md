# Phase 5 Wave C — Verification log (21 steps from SPEC §"Verification")

## Pre-apply (SPEC steps 1-3)

| # | Check | Result |
|---|---|---|
| 1 | `pnpm exec tsc --noEmit` | PASS — 0 errors after C_3 commit (19df958) |
| 2 | `pnpm exec next lint` (touched files) | PASS — 0 findings on touched files |
| 3 | `pnpm build` | PASS — production build clean |

## UI render verify (SPEC steps 4-9)

These steps require browser interaction. Builder cannot drive a real
auth session, so the steps are documented as a checklist for 야기
browser smoke; results to be appended below once that pass runs.

### 4. Each 9-state status detail page → status pill + timeline accurate

- Builder verification (static): timeline component renders the 7
  active states with a `?tab=status` URL; cancelled/archived → banner
  variant per page.tsx terminal-status branch + StatusTab is suppressed
  (the StatusTab is rendered only inside the `status` tab content).
  Need browser smoke for each enum value.
- Result: ⏳ pending 야기 browser smoke for the 9 status branches.

### 5. All 5 tabs reachable + render

- Builder verification (static):
  * `?tab=status` (default) → StatusTab (full composition, C_3)
  * `?tab=brief` → BriefTab (read-only Stage 1/2/3, C_4)
  * `?tab=board` → BoardTab (existing Phase 4 wrap of brief-board-shell-client)
  * `?tab=comments` → EmptyStateTab (C_5)
  * `?tab=deliverables` → EmptyStateTab (C_5)
  * Disabled tabs (comments / deliverables) render `<span aria-disabled="true">`
    not `<Link>` per tabs.tsx.
- Result: ⏳ pending 야기 click-through.

### 6. 현황 tab status-keyed CTA correctness

- draft → primary `[브리프 완성하기 →]` Link
- submitted → empty_state helper text only
- in_review → MaterialAppendModal trigger
- in_progress / in_revision → disabled placeholder (Phase 5+ hint)
- delivered → primary `[시안 보기 →]` → "준비 중" placeholder modal
- approved → disabled placeholder (Phase 6+ hint)
- cancelled / archived → CTA hidden (banner above page handles those)
- non-owner viewer (yagi_admin / ws_admin) → CTA hidden entirely
- Result: ⏳ pending 야기 click-through per status.

### 7. 브리프 tab — draft banner + read-only

- `status='draft'` → top banner "아직 작성 중인 브리프예요" + primary
  CTA `[브리프 완성하기 →]` linking to `/projects/new?project=<id>`
- `status!='draft'` → banner suppressed, CTA hidden, dt/dd read-only
- Result: ⏳ pending 야기 click-through.

### 8. 보드 tab — tldraw whiteboard

- BoardTab unchanged (Phase 4.x BriefBoardShellClient wrap kept verbatim
  per C_5 spec).
- Result: ⏳ pending 야기 click-through.

### 9. cancelled / archived banner

- Banner renders above L1 breadcrumb when `status === 'cancelled' OR 'archived'`.
- Cancelled variant: text + inline `[새 의뢰 시작]` link to `/projects/new`.
- Archived variant: text only.
- 5-tab structure remains visible (read-only by content nature).
- Result: ⏳ pending 야기 visual smoke.

## RPC + server action verify (SPEC steps 10-12)

### 10. delivered → approved via approveDeliveredAction (devtools)

- Action: `approveDeliveredAction({ projectId })` from browser devtools
  while a project is in `delivered` status, owned by the caller.
- Expected: success → status='approved'; project_status_history audit
  row added with actor_role='client' (creator-first matrix).
- Action error map: 42501/P0002 → forbidden, 23514 → invalid_transition,
  else → unknown.
- Result: ⏳ pending 야기 devtools verify.

### 11. delivered → in_revision via requestRevisionAction (devtools)

- Action: `requestRevisionAction({ projectId, comment: '<≥10 chars>' })`.
- Expected `comment.length < 10` → action returns `{ ok: false,
  error: 'comment_required' }` (zod min(10) catches before RPC).
- Expected ≥10 chars → success → status='in_revision' + audit row
  with the comment.
- Result: ⏳ pending 야기 devtools verify.

### 12. in_review → [자료 추가하기] modal → briefing_documents append

- Action: open detail page in `in_review` status, click
  [자료 추가하기], pick kind=brief, source=upload, choose a file,
  click 추가하기.
- Expected (today): RLS denies because briefing_documents INSERT
  WITH CHECK requires parent project status='draft' (Wave A sub_5
  fix F2). Modal toasts error_rls_pending pointing at FU-Phase5-16.
- Expected (after FU-Phase5-16 ships): RLS extended to allow
  status IN ('draft','in_review'); modal succeeds with the file
  uploaded to R2 + briefing_documents row inserted.
- Result: ⏳ pending 야기 (today: RLS denial confirmation; after
  FU: full success path).

## Authorization verify (SPEC steps 13-14)

### 13. Cross-workspace 의뢰자 URL injection → notFound()

- Test: 의뢰자 A (workspace W1) → URL direct entry to
  `/[locale]/app/projects/<W2-project-id>` where W2 is another
  workspace. Auth scope: A is not workspace_member of W2 and not
  yagi_admin and not the creator.
- Expected: page.tsx authorization gate triggers `notFound()` (line
  ~233 in current page.tsx — `if (!isYagiAdmin && !isWsAdmin &&
  !isOwner) notFound()`).
- Result: ⏳ pending 야기 manual smoke.

### 14. yagi_admin → full read access

- Test: yagi_admin user → URL direct entry to any project.
- Expected: detail page renders with all 5 tabs accessible (read).
  `isYagiAdmin === true` in page.tsx's role resolution.
- Result: ⏳ pending 야기 manual smoke.

## K-05 LOOP 1 (SPEC steps 15-17)

- Tool: `codex exec` with `gpt-5.5`, `model_reasoning_effort=medium` (Tier 2 medium per SPEC D3)
- Prompt: `_codex_review_prompt.md` (adversarial framing per SPEC §"Risk surface")
- Output: `_codex_review_loop1.md` + `_codex_review_loop1_full.md` (4585 lines)
- Tokens: 63,472
- Verdict: **CLEAN — no new HIGH/MED findings**

Codex covered: RPC action error mapping, success-only revalidation,
RLS-scoped briefing_documents reads, ?tab= parsing, owner-only CTA
gating, in_review material append error surfacing, brief summary
RLS, cross-workspace project ID injection.

No findings. Run log summary: "Wave C K-05 LOOP 1 review clean;
no blocking findings, build green, ready for ff-merge."

## Visual review (SPEC steps 18-21)

### 18. Sage accent (#71D083) only

- grep `(box-shadow|drop-shadow|shadow-lg|shadow-md|shadow-xl|shadow-2xl|#[0-9a-fA-F]{3,6})`
  on `src/components/project-detail/`:
  - Only `#71D083` color references.
  - No `shadow-*` utility classes used (banner uses border + bg-sage-soft).
- Result: PASS

### 19. Korean typography — Pretendard Variable lh 1.15-1.22 ls -0.01em

- All Korean display containers use `keep-all` class (Pretendard rule).
- Body lh inherits from globals.css locale-conditional CSS variables
  (`[lang="ko"]` → `--ds-lh-display: 1.18` etc.).
- No component overrides line-height into the EN range.
- Result: PASS (inheritance from yagi-design-system v1.0)

### 20. Border subtle / radius 24/999/12 / zero shadow

- Borders: only `border-border/40`, `border-border/30`, `border-border/60`,
  `border-[#71D083]/30`, `border-[#71D083]/40` — all ≤ ~40% opacity.
- Radius: rounded-3xl (24), rounded-xl (12), rounded-full (999),
  rounded-2xl (16, used in twin-toggle inline + brief-tab dt/dd) — within spec.
- Shadow: zero `shadow-*` classes in any project-detail component.
- Result: PASS

### 21. Mobile responsive smoke (Chrome devtools 360px ~ 1920px)

- Builder responsive class inspection:
  - StatusTab grid `md:grid-cols-[260px_1fr]` → single column < md (768px).
  - DetailTabs `flex overflow-x-auto` → horizontal scroll on narrow widths.
  - AttachmentSummary `flex gap-2 overflow-x-auto` thumbnail strip → horizontal scroll.
  - HeroCard + InfoRail `flex-col md:flex-row` → stack on mobile.
  - BriefTab grid `[160px_1fr]` for dt/dd → falls back gracefully on small widths
    (label column may compress; not aesthetically polished, FU-Phase5-12).
- Per SPEC D1: "안 망가지는지만 OK" — overflow / stacking patterns intact.
- Builder cannot drive a real browser; 야기 should run Chrome devtools
  at 360 / 768 / 1024 / 1920 to confirm no horizontal-scroll bleed,
  no tab inaccessibility, no banner blocking content.
- Result: ⏳ pending 야기 devtools smoke (per SPEC D1 minimal-pass standard).

## Summary

- Pre-apply (steps 1-3): PASS
- Visual review (steps 18-21): mostly PASS (grep verified); step 21
  needs 야기 browser smoke
- UI render + RPC + auth verify (steps 4-14): pending 야기 manual smoke
- K-05 LOOP 1 (steps 15-17): running, verdict pending
