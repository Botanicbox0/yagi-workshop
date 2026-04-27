# Phase 2.5 G3 — Task Plan (Agent Team / parallel_group)

**Worktree:** `.claude/worktrees/g3-challenges/` (branch `worktree-g3-challenges`)
**Base:** `1fb9dd2` (pre-G3 infra: markdown, status helpers, brand assets)
**Authority:** SPEC v2 §3 G3 + G3-ENTRY-DECISION-PACKAGE.md (yagi ADOPT via Telegram msg #55 reply)
**Adopted decisions:** §0 ADOPT as-is · Q2-1 B (observer → `/onboarding/role`) · Q2-2 A (symbol logo) · Q2-3 A (skip count) · Q2-4 A (hover-autoplay ON) · Q2-5 A (1/2/3 grid)

---

## Execution model

Single lead (this Claude Code session in `g3-challenges` worktree), Agent Team in-process, teammates spawned per `parallel_group`. Between groups: `pnpm exec tsc --noEmit` + `pnpm lint`. Stop point between Group B and Group C for yagi visual review.

---

## Group A — Foundations (3 teammates, parallel)

Purpose: libs + i18n + chrome primitives. All three write disjoint file sets. No cross-deps within group.

```yaml
- id: A1
  goal: Challenge data types, queries, and urgency helpers
  files:
    - src/lib/challenges/types.ts
    - src/lib/challenges/queries.ts
    - src/lib/challenges/urgency.ts
  parallel_group: A
  depends_on: []
  complexity: simple
  notes: |
    - types.ts: SubmissionRequirements + JudgingConfig per DP §C type block (verbatim).
    - queries.ts: getChallengesList (3 parallel by state), getChallengeBySlug, getChallengeGallery.
      Use createSupabaseServer; export const dynamic = "force-dynamic".
    - urgency.ts: computeUrgencyTier(close_at) → "normal" | "h24" | "h1" per DP §C.2.

- id: A2
  goal: Korean i18n namespace for /challenges/*
  files:
    - messages/ko.json
  parallel_group: A
  depends_on: []
  complexity: simple
  notes: |
    Add "challenges" namespace. Keys per DP sections:
      §B headline, section titles (진행 중 / 결과 발표 / 지난 챌린지)
      §C.2 status banner (6 states, urgency tiers)
      §C.3 primary CTA matrix (6 rows)
      §C.4 empty states (no-submissions / zero-yet)
      §D.1 winners section title + subtitle
      §D.2 vote button labels (응원하기 / 응원)
      §D.3 toast copy
      §F.1 status pill labels (overrides defaults if any drift with status-labels.ts)
      §A header CTA labels (4 rows, Q2-1 B adopted)
    Enforce §J vocabulary: 제출→작품 올리기, 투표→응원, 갤러리→작품 보기, 수상작→주인공.
    en.json: SKIP per SPEC §0 "Korean only".

- id: A3
  goal: Public chrome + route layouts + 404
  files:
    - src/components/challenges/public-chrome.tsx
    - src/components/challenges/header-cta-resolver.tsx
    - src/app/challenges/layout.tsx
    - src/app/challenges/[slug]/layout.tsx
    - src/app/challenges/[slug]/not-found.tsx
  parallel_group: A
  depends_on: []
  complexity: complex   # bumped from "medium" — orchestrator model selection (simple→Haiku / complex→Sonnet) is binary; server-side auth + role branching + routing warrants Sonnet
  notes: |
    - public-chrome.tsx: header (yagi-symbol.png left, "챌린지" text, context-aware CTA slot right)
      + <SiteFooter> from src/components/home/site-footer.tsx. NO sidebar, NO notification bell.
    - header-cta-resolver.tsx: server-resolved CTA per DP §A matrix (Q2-1 B adopted):
        no-auth → "참여 시작하기" /signin?next=<current>
        creator|studio → "작품 올리기" → first open challenge submit
        observer → "창작자로 참여하기" → /onboarding/role  ← Q2-1 B
        is_yagi_admin → "새 챌린지" → /admin/challenges/new
    - layout.tsx: minimal locale bridge (mirror src/app/showcase/layout.tsx)
    - [slug]/layout.tsx: slug-context wrapper, metadata handoff
    - not-found.tsx: mirror src/app/showcase/[slug]/not-found.tsx (self-contained html/body shell
      per Phase 1.9 G6 Next 15.5 workaround)
```

**Barrier A→B:** `pnpm exec tsc --noEmit; pnpm lint` both EXIT=0.

---

## Group B — List + Detail surfaces (2 teammates, parallel)

Purpose: the 2 public surfaces yagi will visually review. Gallery deferred to Group C.

```yaml
- id: B1
  goal: /challenges list page
  files:
    - src/app/challenges/page.tsx
    - src/components/challenges/challenge-list-section.tsx
    - src/components/challenges/challenge-card-mobile.tsx
  parallel_group: B
  depends_on: [A1, A2, A3]
  complexity: medium
  notes: |
    - page.tsx: RSC. 3 sections per DP §B (진행 중 / 결과 발표 / 지난 챌린지).
      진행 중: close_at ASC. 결과 발표: announce_at DESC, limit 8.
      지난 챌린지: collapsed-by-default, expand → "더 보기" pagination up to 12.
    - challenge-list-section.tsx: <Table> wrapper per UI_FRAMES Frame-2 (table, NOT cards).
      Columns per section per DP §F:
        진행 중: Title · 마감일 (D-N) · 상태 pill
        결과 발표: Title · 발표일 · 주인공 N · 상태 pill
        지난: Title · 발표일 · 상태 pill
      Use statusPillClass("challenge", state) + statusLabel("challenge", state).
      Q2-3 A adopted: NO "참여작 N" column. Skip the submission-count RPC.
    - challenge-card-mobile.tsx: stacked key/value card for <640px via hidden sm:table-cell.
    - MetadataRoute/generateMetadata: title, description (stripped from description_md), OG image.
    - Headline: "지금 가장 주목받는 AI 챌린지" (h1, font-display).
    - SEO robots: index=true for open/closed_announced, false for closed_judging/archived.

- id: B2
  goal: /challenges/[slug] detail page
  files:
    - src/app/challenges/[slug]/page.tsx
    - src/components/challenges/status-banner.tsx
    - src/components/challenges/requirements-display.tsx
    - src/components/challenges/timeline-display.tsx
    - src/components/challenges/primary-cta-button.tsx
    - src/components/challenges/share-button.tsx
    - src/components/challenges/empty-state.tsx
  parallel_group: B
  depends_on: [A1, A2, A3]
  complexity: complex
  notes: |
    - page.tsx: sections [1]–[7] per DP §C.1 (hero, status banner, description, requirements,
      timeline, primary CTA, secondary CTAs). Server component default, client islands only
      for interactive bits (share, CTA button).
      Use <MarkdownRenderer content={challenge.description_md} /> from
      src/components/challenges/markdown-renderer.tsx (already ported).
      404 via notFound() when slug missing or state = 'draft' per RLS.
    - status-banner.tsx: renders per DP §C.2 matrix.
      Uses urgency.ts → "normal" | "h24" | "h1" to pick banner copy + tone class.
    - requirements-display.tsx: SubmissionRequirements JSONB → Korean readable.
      E.g. "60초 이내 mp4 영상 (최대 500MB) · 텍스트 설명 50-2000자".
    - timeline-display.tsx: open_at / close_at / announce_at with date-fns, Korean format.
    - primary-cta-button.tsx: DP §C.3 matrix (6 rows) — server-resolved per auth + role + state.
      Observer + open → "창작자로 참여하기" (Q2-1 B parity, though this is detail-level CTA).
    - share-button.tsx: Web Share API + navigator.clipboard fallback (client island).
    - empty-state.tsx: 의인화 copy per DP §C.4 ("첫 번째 작품을 기다리고 있어요" +
      "이 챌린지의 첫 주인공이 되어보세요"). Reusable: also used in Group C gallery empty state.
```

**Barrier B→(stop):**
- `pnpm exec tsc --noEmit; pnpm lint` both EXIT=0.
- Smoke: `curl -sI localhost:3003/challenges` → 200, `curl -sI localhost:3003/challenges/test-open-1` → 200, `curl -sI localhost:3003/challenges/does-not-exist` → 404.
- Seed DP §I test data SQL if not already seeded (yagi runs in SQL Editor; Builder instructs).

**STOP POINT (yagi manual):** visual review of `/challenges` + `/challenges/[slug]` at `localhost:3003`. Builder pauses here per SPEC §3 G3 + DP §H. On yagi PASS → resume Group C.

---

## Group C — Gallery + realtime + vote (1 teammate)

Purpose: gallery surface. Single teammate because components are tightly coupled and realtime is the first such pattern in the codebase.

```yaml
- id: C1
  goal: /challenges/[slug]/gallery page + vote action + realtime
  files:
    - src/app/challenges/[slug]/gallery/page.tsx
    - src/app/challenges/[slug]/gallery/actions.ts
    - src/components/challenges/gallery-grid.tsx
    - src/components/challenges/gallery-realtime.tsx
    - src/components/challenges/submission-card.tsx
    - src/components/challenges/vote-button.tsx
  parallel_group: C
  depends_on: [A1, A2, A3, B2]
  complexity: complex
  notes: |
    - page.tsx: RSC. Fetches submissions via getChallengeGallery(slug).
      Winners section pinned at #winners if state ∈ {closed_announced, archived}.
      Empty state reuses <EmptyState> from B2.
    - actions.ts: castVote Server Action.
      RLS UNIQUE (challenge_id, voter_id) + state='open' enforced in SQL.
      Error path → Sonner toast (§D.3 auth-gate pattern for un-auth case).
    - gallery-grid.tsx: desktop 3-col / tablet 2-col / mobile 1-col (Q2-5 A).
    - gallery-realtime.tsx: client island. channel(`gallery:${challengeId}`).on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'challenge_submissions',
        filter: `challenge_id=eq.${challengeId}` }, () => router.refresh()).
      Cleanup on unmount. First realtime subscriber in codebase — pattern lives here.
    - submission-card.tsx: hover-autoplay muted loop (Q2-4 A). Respects prefers-reduced-motion
      via CSS @media (prefers-reduced-motion: reduce) { video { animation-play-state: paused } }.
      Winner rank badge (🥇/🥈/🥉 + 응원 count, comma-formatted) when on winner row.
    - vote-button.tsx: reaction-button pattern from src/components/share/fast-feedback-bar.tsx.
      Default: "♥ 응원하기 <count>". Voted: "♥ 응원 <count>" filled.
      Un-auth click → Sonner toast with action button "참여 시작하기" → /signin?next=...
      (per DP §D.3). Observer can vote (SPEC §1 role matrix — all roles vote, only
      creator/studio submit).
      Vote count is static from initial server fetch (Q: no realtime on count per DP §D).
```

**Barrier C→D:** `pnpm exec tsc --noEmit; pnpm lint` both EXIT=0. Manual 2-browser realtime smoke added to `.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md` (the 5s SLA verification per SPEC §2 #6 is yagi-run, not Builder-run).

---

## Group B.5 — Visual polish (inserted post-Group-B visual review, 2026-04-24)

Triggered by yagi feedback during Group B visual review: (1) live countdown timer per standard software pattern, (2) thumbnail support for `hero_media_url`, (3) Higgsfield-style card grid for 지난 챌린지 using YAGI color tokens.

Shared interface locked up-front (both teammates rely on this contract):

```typescript
// src/lib/ui/placeholder-gradient.ts (NEW, authored by B.5-1)
export function slugGradient(slug: string): string;
// Returns a deterministic `linear-gradient(135deg, hsl(..), hsl(..))` CSS value
// keyed on slug hash. Muted-pastel hue range to stay cohesive with YAGI tokens.
```

```yaml
- id: B.5-1
  goal: List-side thumbnail + Higgsfield-style archived card grid
  files:
    - src/lib/ui/placeholder-gradient.ts            (NEW)
    - src/components/challenges/archived-card-grid.tsx (NEW)
    - src/components/challenges/challenge-list-section.tsx (EDIT — add 16:9 thumbnail column to open + announced tables, route archived to <ArchivedCardGrid/>)
    - src/components/challenges/challenge-card-mobile.tsx (EDIT — thumbnail at top, 16:9 aspect)
    - src/app/challenges/page.tsx (EDIT — wire archived grid inside existing <details> collapse per D1)
  parallel_group: B.5
  depends_on: []
  complexity: complex

- id: B.5-2
  goal: Countdown timer + detail hero gradient fallback
  files:
    - src/components/challenges/countdown-timer.tsx (NEW)
    - src/components/challenges/status-banner.tsx (EDIT — render <CountdownTimer/> for state=open, all urgency tiers; keep h1 warning copy + timer below per D4)
    - src/app/challenges/[slug]/page.tsx (EDIT — hero gradient fallback when hero_media_url is null, using placeholder-gradient.ts)
  parallel_group: B.5
  depends_on: []   # soft dep on B.5-1's placeholder-gradient.ts; interface pre-locked above so parallelism safe
  complexity: complex
```

**Decisions (yagi ADOPTED per builder recommendation, 2026-04-24):**
- D1 keep `<details>` collapsed-by-default
- D2 keep 12-row cap on archived
- D3 thumbnails in all 3 sections (table rows get small thumb, archived grid gets full-card thumb)
- D4 at h1 urgency: warning text + timer-below (complementary)
- D5 gradient fallback suffices for current visual review; real images deferred until client content lands

**Barrier B.5 → (next visual review):** `pnpm exec tsc --noEmit; pnpm lint` EXIT=0, design-system audit clean, §J audit clean. Dev server stays running.

---

## Group D — Sitemap + e2e smoke (1 teammate)

```yaml
- id: D1
  goal: Sitemap extension + e2e smoke script
  files:
    - src/app/sitemap.ts
    - tests/e2e/challenges.smoke.sh   # or .mjs mirror-test pattern
  parallel_group: D
  depends_on: [B1, B2, C1]
  complexity: simple
  notes: |
    - sitemap.ts: extend with /challenges + dynamic /challenges/[slug] for
      state IN ('open', 'closed_announced') only. Skip archived (SEO dilution).
    - smoke: curl 200 for /challenges, /challenges/<seed-slug>, /challenges/<seed-slug>/gallery.
      curl 404 for fake slug. Follow Phase 2.1 G7 .mjs mirror-test pattern if preferred.
```

**Barrier D→G3 CLOSEOUT:** `pnpm build` EXIT=0, `pnpm exec tsc --noEmit` EXIT=0, `pnpm lint` EXIT=0.

---

## Files NOT in this task plan (already present on base `1fb9dd2`)

- `src/components/challenges/markdown-renderer.tsx`
- `src/lib/ui/status-pill.ts` (extended with submission kind)
- `src/lib/ui/status-labels.ts`
- `public/assets/logo/yagi-symbol.png`, `yagi-wordmark.png`
- `public/fonts/PretendardVariable.woff2`, `WFVisualSansVF.woff2`

Builder consumes these by import; does not re-author.

---

## Files intentionally deferred past G3

Per DP + yagi decisions:

- `get_challenge_submission_counts` RPC — Q2-3 A (skip for MVP)
- `messages/en.json` challenges namespace — SPEC §0 "Korean only"
- `opengraph-image.tsx` — DP §G SEO section (defer to Phase 2.7)
- Admin challenge management routes (`/admin/challenges/*`) — G5 scope, not G3
- Submission upload flow (`/challenges/[slug]/submit`) — G4 scope, not G3

---

## Codex K-05 timing

Per SPEC §7 (ADR-005 expedited), Phase 2.5 runs Codex K-05 ONCE at G8 on full Phase 2.5 diff — not per gate. G3 does not trigger K-05. DB protocol §1 does not apply to G3 since G3 introduces no migration (G1 schema already shipped; no new tables/RPCs/policies in G3).

If any Group C work accidentally requires a DB object (e.g. vote-count read helper), halt and escalate — that constitutes SPEC drift requiring migration + K-05 pre-apply.

---

## Estimated timing (reference only)

| Group | Teammates | Wall time |
|---|---|---|
| A | 3 parallel | 45–60 min |
| B | 2 parallel | 60–90 min |
| **Stop** | — | yagi visual review |
| C | 1 | 45–60 min |
| D | 1 | 15–30 min |

Total Builder wall time: ~2.5–3.5h (excl. yagi review). Matches SPEC §3 G3 "Duration target: 4–5 hours" with parallelism headroom.
