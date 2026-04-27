# G3 Pre-Audit — Public challenge surfaces

> Source: src/ survey (2026-04-23, post-commit 58dbf6e).
> Precondition: [BLOCKS 2.5] X1 retoken items CONFIRMED landed in commits f2815f1, c6040bc, 8121538, ade027f (ancestors of 58dbf6e). See _summary.md §precondition-check.

---

## 1. 현존 인프라 inventory

### Closest precedent: `/showcase`
- `src/app/showcase/[slug]/page.tsx` — public showcase display (no auth)
- `src/app/showcase/[slug]/layout.tsx` — locale/context setup
- `src/app/showcase/[slug]/actions.ts` — server mutations + `createSignedUploadUrl`
- `src/app/showcase/[slug]/password-prompt.tsx` — password-gated variant (client component)
- `src/app/showcase/[slug]/resolve-locale.ts` — locale resolution
- `src/app/showcase/[slug]/not-found.tsx` — custom 404 (only custom one in src/app)
- Pattern: server component default, client islands for interaction

### Similarly public: `/s/[token]` (share)
- `src/app/s/[token]/page.tsx` — post-X1 retoken, semantic tokens only
- `src/components/share/*` — approve-button, comment-form, fast-feedback-bar, revision-compare. All post-c6040bc converted to `<Input>`/`<Textarea>`/`<Button>` primitives.

### Design-system ground truth (post-X1)
- `src/lib/ui/status-pill.ts` (new, commit ade027f) — centralized status-pill helper; use for challenge state pills (DRAFT/OPEN/CLOSED_JUDGING/CLOSED_ANNOUNCED/ARCHIVED)
- `src/components/ui/button.tsx` — now has `pill` size variant (commit f2815f1) — canonical public CTA
- Semantic tokens live: `--success`, `--warning`, `--info` (light + dark variants, commit ade027f)

### Middleware matcher (`src/middleware.ts:14-26`)
```
"/((?!api|_next|_vercel|auth/callback|showcase|challenges|.*\\..*).*)"
```
`/challenges` **already excluded** from intl redirect (Phase 2.1 G6 preemptive, commit 5855dd0). Confirmed: no change needed at G3. `/u` exclusion deferred to G6.

### MetadataRoute / generateMetadata patterns
Existing uses:
- `src/app/s/[token]/page.tsx:24` — dynamic OG for share token
- `src/app/showcase/[slug]/page.tsx:236` — dynamic OG for showcase
- `src/app/[locale]/journal/[slug]/page.tsx:104` — article OG
- `src/app/[locale]/work/page.tsx:28` — work index

**Copy-paste model:** showcase's generateMetadata. Challenge page metadata should pull title, description_md excerpt, hero_media_url.

### Realtime subscription primitives
- **No existing usage of `supabase.channel()` / `on('postgres_changes')` in src/** today.
- G3 gallery will be the **first realtime subscriber** in the codebase.
- Supabase JS SDK has the API; pattern must be built from scratch (likely a `src/hooks/use-realtime-*.ts`).

### UI_FRAMES Frame-2 (Browse) contract
Source: `.yagi-autobuild/design-system/UI_FRAMES.md` rows 93-150 + `COMPONENT_CONTRACTS.md §5.6`.

Rules for `/challenges` list:
- **Table-first design** (not cards) per §5.6 — default for Browse
- Sticky headers, dense rows, hairline separators
- Numeric columns right-aligned + `font-feature-settings: "tnum"`
- First column: primary identifier (challenge title, link)
- Last column: actions (View, or state-pill)
- Filter bar: search left, filters mid, sort right
- Mobile collapses to stacked list
- **Card variant NOT allowed** unless ADR precedes it (ADR-005 forbidden trigger: no new variant mid-build)

---

## 2. 새로 만들어야 할 것

### New routes (3)
1. `src/app/challenges/page.tsx` — public list (server component, table layout per UI_FRAMES Frame-2)
2. `src/app/challenges/[slug]/page.tsx` — detail (hero + markdown desc + requirements + timeline + CTA)
3. `src/app/challenges/[slug]/gallery/page.tsx` — submissions grid + realtime subscription (client island)

### New route structure (layout + not-found)
- `src/app/challenges/layout.tsx` — minimal locale bridge (similar to showcase layout)
- `src/app/challenges/not-found.tsx` — custom 404 (mirror showcase pattern)

### New libs
- `src/hooks/use-challenge-gallery-realtime.ts` — subscribes to `challenge_submissions` INSERT for a challenge_id; returns new-submission events
- `src/lib/challenges/queries.ts` — SSR query helpers (`getChallenges`, `getChallengeBySlug`, `getChallengeGallery`)
- `src/lib/markdown/render.ts` — markdown renderer for challenge description_md (SPEC says description_md in JSONB). **No existing markdown renderer.** DOMPurify also absent — must pick pipeline (recommend: `react-markdown` + `rehype-sanitize`, or `marked` + `DOMPurify`).

### Type surface
Regenerate `src/lib/supabase/database.types.ts` after G1 is in DB (confirmed applied per commit 58dbf6e). If not yet regenerated, G3 start blocked on:
```
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

### i18n
- New namespace `messages/{ko,en}.json` → `challenges.*` keys (list headers, state labels, CTA copy, empty states)

---

## 3. SPEC vs 현실 drift (의심점)

### Cross-ref: PRE-1 impact on G3
- Public surfaces read `challenges` and `challenge_submissions` — **both RLS-gated by `profiles.role` (Phase 2.5) or no auth (public SELECT).** G3 itself does not touch `user_roles`. Collision risk is low IF G3 reads only `challenges.state` and public-SELECT policies. **Confirm at G3 entry:** no AppContext `roles.includes('creator')` logic in public pages (they should be auth-less).

### Cross-ref: 4 web Claude sidebar/layout findings
- Findings #1-4 affect authenticated app shell (sidebar 3-tier, workspace switcher dropdown, header NotificationBell-only) — **not G3 public surfaces.** No direct G3 impact. Note: Phase 2.6 P1/P2/P4 partial implementations already exist; G3 must not overwrite these.

### Realtime pattern (first in codebase)
- G3 is first realtime subscriber. No internal precedent; follow Supabase docs directly.
- **Risk:** pub membership for `challenge_submissions` was added in G1 (commit 58dbf6e; verified in commit body `pg_publication_tables` check). Confirmed OK.
- Connection lifecycle (`useEffect` cleanup, reconnect on locale change) must be designed fresh.

### Markdown pipeline absence
- SPEC §1 "description_md" assumes a markdown render step. Codebase has **zero markdown rendering code**.
- DOMPurify absent. XSS risk on admin-authored description_md.
- Pick pipeline BEFORE G3 starts. Recommendation: `react-markdown` (MIT, Next 15 compatible) + `rehype-sanitize` (default safe list).

### Component contract compliance risk
- G3 is the first Phase 2.5 UI. Templates copied from showcase/share are POST-retoken, so risk low.
- Gallery grid pattern is uncharted — it must adhere to UI_FRAMES Frame-2 table/list contract OR explicitly ADR a grid-card variant first (ADR-005 forbidden-trigger exemption required).
- SPEC §3 G3 Task 3 says "grid of submissions" — **potentially conflicts with §3 G3 Task 1 "table" constraint.** Gallery is a visual-first surface (videos + images); table layout may feel wrong. **Decision item for yagi: is a gallery grid an exception requiring ADR, or does it fall under Frame-2 card variant?**

### i18n scope
- SPEC §0 "Multilingual challenges (Korean only)" — non-goal per §0.
- But the public shell (`/challenges`) still goes through next-intl routing because middleware wraps everything.
- Decision: are challenge routes locale-prefixed (`/ko/challenges`, `/en/challenges`) or locale-free (just `/challenges`)?
- Current `/showcase` is locale-free (outside `[locale]`). Current middleware excludes `/challenges` similarly — implies locale-free. Confirm intent.

---

## 4. 외부 의존 / ENV prereq

- No new ENV vars.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` already in use for anon realtime subscription.
- **Realtime quota note:** Supabase Free plan = 2 concurrent connections per user. Pro plan = 200 connections total. For public gallery, each tab holding the page = 1 conn. Consider throttle/reconnect.

---

## 5. 테스트 전략 권고

| Layer | Scope | Pattern |
|---|---|---|
| Unit | Markdown sanitization (XSS inputs → expect safe output) | `.mjs` mirror-test |
| Unit | `getChallengeBySlug` slug-not-found / state-filtering logic | vitest or .mjs |
| Integration | RLS public SELECT on `challenges` state IN (open,closed_judging,closed_announced,archived) | Direct supabase anon client |
| E2E | `curl http://localhost:3003/challenges` → 200, no auth cookie | Bash smoke |
| E2E | `curl` a known-slug detail + gallery; `curl` fake slug → 404 | Bash smoke |
| Manual QA | Two-browser realtime smoke (5s SLA per SPEC §2 #6) | YAGI-MANUAL-QA-QUEUE entry |
| Visual | Page compliance vs X1 audit: no hardcoded grays/blacks, no off-scale type, radii = 6/8/full | Agent re-audit at G3 stop |

---

## 6. 잠재 야기 결정 항목

1. **Locale-prefix vs locale-free** for `/challenges` routes — pick (default suggested: locale-free, mirroring showcase).
2. **Gallery layout contract** — Frame-2 table vs grid-card-variant ADR? (SPEC G3 Task 3 says "grid"; PRINCIPLES forbids new variant mid-build.)
3. **Markdown renderer pick** — `react-markdown` + `rehype-sanitize` (recommended) or `marked` + `DOMPurify`? Server component compatibility matters.
4. **Empty state copy** — `/challenges` with zero published challenges (before first one lands): what does the page show?
5. **Gallery realtime scope** — only INSERT, or also DELETE (admin removes bad submission) and UPDATE (status transitions processing→ready)?
6. **SEO robots directive** — `/challenges` indexable from day 1, or hold until first challenge published? (Phase 2.6 BACKLOG mentions robots.txt.)

---

**Cross-ref:** SPEC §3 G3 Precondition (X1 BLOCKS 2.5) → _summary.md §precondition-check (PASS).
