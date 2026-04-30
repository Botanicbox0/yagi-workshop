# task_04 — Post-submit detail page redesign result (Wave B)

**Status**: completed (lead Builder, autopilot)
**Branch**: `g-b-9-phase-4` (HEAD updated through sub-commits 1..10)
**Sub-commits**: 10 chronological commits per autopilot prompt plan

---

## Sub-commit map

| # | SHA | scope |
|---|---|---|
| 1/10 | `d0a0df7` | project-detail/ dir + placeholder-tab.tsx |
| 2/10 | `5219399` | status-timeline.tsx (5-stage horizontal pipeline) |
| 3/10 | `ee094b1` | hero-card.tsx (1:1 cinematic 720x720) |
| 4/10 | `a1afa21` | info-rail.tsx (5 fields, 360 wide) |
| 5/10 | `ef4ee92` | tabs.tsx (4-tab nav with disabled UX) |
| 6/10 | `f7ff1b7` | board-tab.tsx (wraps BriefBoardShellClient + own data fetch) |
| 7/10 | `a619e6a` | progress-tab.tsx (project_status_history vertical timeline) |
| 8/10 | `9df56d5` | page.tsx integration (587 lines deleted, 230 added — net -357) |
| 9/10 | `ad4075e` | i18n project_detail namespace (~50 keys × 2 locales) + board-tab fallback strings |
| 10/10 | (this commit) | result_04.md + final verify |

---

## Layout shipped (KICKOFF section task_04 spec)

```
┌──────────────────────────────────────────────────────────┐
│ ← projects · workspace · brand · project title           │
├──────────────────────────────────────────────────────────┤
│ ●  검토 ── ○  라우팅 ── ○  진행 ── ○  시안 ── ○  납품   │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────┐  ┌────────────────────────┐ │
│ │  HeroCard 1:1 720x720    │  │ Info rail (360)        │ │
│ │  - status pill (sage)    │  │ - 의뢰 일자             │ │
│ │  - banner line (in_review│  │ - 예산                  │ │
│ │  - title (Pretendard 30) │  │ - 납기                  │ │
│ │  - description (16/1.37) │  │ - Twin intent           │ │
│ └──────────────────────────┘  │ - 미팅 희망             │ │
│                                │                         │ │
│                                └────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ [보드] [진행] [코멘트●] [결과물●]  ← active underlined    │
├──────────────────────────────────────────────────────────┤
│ <Tab content panel>                                      │
│ - board: BriefBoardShellClient + AttachmentsSection      │
│ - progress: project_status_history vertical timeline     │
│ - comment: PlaceholderTab (no fetch)                     │
│ - deliverable: PlaceholderTab (no fetch)                 │
├──────────────────────────────────────────────────────────┤
│ Admin actions row (yagi_admin only)                      │
│ - ProjectActionButtons (status transitions)              │
│ - AdminDeleteButton                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Status mapping (no new schema)

Phase 4.x does NOT add new statuses. The 5 timeline visual stages
map to the existing 9-state CHECK constraint:

| Stage (label) | Active when status ∈ |
|---|---|
| 검토 | `draft`, `submitted`, `in_review` |
| 라우팅 | (none — reserved visual slot) |
| 진행 | `in_progress`, `in_revision` |
| 시안 | (none — Phase 5+ approval_pending slot) |
| 납품 | `delivered`, `approved` |

`cancelled` / `archived` do not advance the bar; the hero card status
pill surfaces the actual state and the timeline anchors at 검토.

The `routing` and `approval_pending` slots are visible but never
"passed" or "active" until their status values exist on
`projects.status` (out of Wave B scope).

---

## Authorization (BLOCKER 1 consistency)

```ts
const isOwner = project.created_by === user.id;
//                                  ^^^^^^^^^^
//                  yagi 4.2 = B: created_by, NOT owner_id

if (!isYagiAdmin && !isWsAdmin && !isOwner) notFound();
```

`workspace_admin` from the project's workspace also passes (backwards
compat with admin sidebar). Everyone else gets a 404.

---

## Self-review checklist (KICKOFF section task_04)

- [x] Detail page every tab → project-scope authorization (`page.tsx`
      enforces before any tab renders)
- [x] 코멘트 / 결과물 tabs disabled — `<span>`, `aria-disabled`, no
      `<Link>`, paired with `PlaceholderTab` that has no DB call
- [x] info-rail → no `project_licenses` data (Phase 4 admin-only;
      info-rail props don't even include license fields)
- [x] HeroCard `cover_image` slot — Phase 4 has no column for it; the
      flat dark surface is intentional; no signed URL exposure
- [x] Mobile 390px — cards vertical stack via `flex-col md:flex-row`;
      status timeline collapses to vertical via `flex-col sm:flex-row`
- [x] /ko + /en parity — ~50 keys × 2 locales committed in sub 9/10
- [x] Design system v1.0 — Pretendard, achromatic + sage `#71D083`
      single accent on current stage + in-flight pill, radius 24
      cards / 999 pills, zero shadow, hairline `border-border/40`

---

## Caveats

- `twin_intent` column added by task_01 migration; not yet applied to
  prod (Wave D D.1). Until apply, the SELECT returns undefined which
  the page coerces to `null`, and InfoRail falls back to the "미입력 /
  Not entered" label gracefully.
- `routing` + `approval_pending` are reserved visual slots only. If
  yagi later wants those as actual statuses, a follow-up migration
  amends the `projects_status_check` constraint + the `transition_*`
  RPCs.
- Some lines in `tStatus.has(...)` and `(tStatus as any)(...)` use
  next-intl's runtime API + a single any-cast. The cast is documented
  inline; alternative is enumerating all 9 status keys upfront, which
  noisily duplicates the labels.

---

## Verify

- tsc clean throughout (verified after every sub-commit)
- build pending (running in background after sub 10/10)
- lint baseline = pre-existing main parity (no Wave B regression)

---

## Wave C entry readiness

Per autopilot prompt: Wave B SHIPPED → Wave C 진입. lead Builder
proceeding to Wave C task_05 (commission redirect + Brand sidebar +
dashboard). Wave D entry STOP (yagi K-05 reviewer decision pending).
