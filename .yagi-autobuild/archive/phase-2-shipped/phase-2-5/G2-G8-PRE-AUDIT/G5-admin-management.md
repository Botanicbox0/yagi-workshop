# G5 Pre-Audit — Admin challenge management

> Source: src/ survey (2026-04-23).

---

## 1. 현존 인프라 inventory

### Admin routes (Phase 1.x)
- `src/app/[locale]/app/admin/page.tsx` — admin dashboard (Google Calendar sync, meetings)
- `src/app/[locale]/app/admin/invoices/page.tsx` — invoice admin table (list-only)
- `src/app/[locale]/app/admin/projects/page.tsx` — project admin table (list-only)
- **Pattern:** list-first, no creation forms yet. G5 introduces first admin creation UX.

### Admin gating pattern
- `is_yagi_admin(auth.uid())` RPC (Phase 1.1) — 15+ files call it
- Pattern: SSR layout or Server Action calls the RPC; 403s / redirects if false
- Example: `src/app/[locale]/app/showcases/actions.ts` + `src/app/[locale]/app/admin/page.tsx`
- **Not implemented as middleware** — each admin route/action re-checks. Phase 2.5 G5 must follow same pattern (SPEC §3 G5 Task 6).

### Admin role bootstrap
- `user_roles` row with `role='yagi_admin'` + `workspace_id IS NULL`
- Seed migration or manual INSERT via Supabase SQL Editor (per SPEC §6 Q1)
- No seeded yagi_admin yet in baseline (HANDOFF implies manual seeding)

### Form infrastructure
- RHF + Zod canonical (`src/app/[locale]/app/settings/profile-form.tsx` as reference)
- No existing **JSONB-building form** in codebase — G5 is first (for `submission_requirements` + `judging_config`)
- Dialog / Sheet primitives available (shadcn)

### State transition pattern
- `invoices.status` transitions happen via Server Actions with RLS gate + audit timestamp
- No existing state-machine helper lib — transitions are hand-rolled per entity
- `challenges.state` CHECK constraint (G1) enforces valid values; transition validity (e.g., can't skip `open → closed_announced`) must be enforced in Server Action

---

## 2. 새로 만들어야 할 것

### New routes (5)
1. `src/app/[locale]/app/admin/challenges/page.tsx` — list + filter by state (Frame-2 table)
2. `src/app/[locale]/app/admin/challenges/new/page.tsx` — creation form
3. `src/app/[locale]/app/admin/challenges/[slug]/edit/page.tsx` — edit form
4. `src/app/[locale]/app/admin/challenges/[slug]/judge/page.tsx` — submissions list + score inputs (or pick-winner UI for admin_only mode)
5. `src/app/[locale]/app/admin/challenges/[slug]/announce/page.tsx` — winner selection + state transition

### New layout
- `src/app/[locale]/app/admin/challenges/layout.tsx` — layout-level `is_yagi_admin` guard (SPEC §3 G5 Task 6)
  - Call `is_yagi_admin(auth.uid())` RPC via Server Component
  - 403 / redirect to `/app` if false
  - Sets admin context for nested routes

### New Server Actions
- `createChallengeAction(payload)` — INSERT into `challenges`
- `updateChallengeAction(slug, payload)` — UPDATE `challenges` (guarded by state)
- `transitionChallengeStateAction(slug, to_state)` — validate transition (draft→open→closed_judging→closed_announced→archived), stamp timestamps, emit notifications
- `submitJudgmentAction(submission_id, score, notes)` — INSERT `challenge_judgments`
- `announceWinnersAction(challenge_id, submission_ids[], ranks[])` — INSERT `showcase_challenge_winners` rows + state transition to `closed_announced`

### New client components
- `challenge-form.tsx` — base form (title, slug, description_md, hero_media, timeline)
- `submission-requirements-builder.tsx` — JSONB builder:
  - Checkbox: native_video / image / pdf / youtube_url / text_description
  - Per-type sub-config (e.g., image count, required flag)
  - Zod schema → JSONB serialization
- `judging-config-builder.tsx` — JSONB builder:
  - Radio: admin_only / public_vote / hybrid
  - If hybrid: weight slider (admin:public, default 70:30)
- `state-transition-button.tsx` — single button per allowed next state, confirms via Dialog

### New lib
- `src/lib/challenges/state-machine.ts` — pure function `allowedTransitions(currentState): State[]`, `isValidTransition(from, to): boolean`
- `src/lib/challenges/judging.ts` — winner calculation for public_vote / hybrid modes (sort by weighted score)

### Slug auto-generation + reserved check
- SPEC §3 G5 Task 2: slug auto-generated, editable
- Reserved check: DB CHECK constraint (`slug !~ '^(new|gallery|submit|edit|judge|announce|admin)$'`) applied in G1 migration (commit 58dbf6e)
- Client-side preview: slugify `title` via new `src/lib/slug.ts` or reuse if present (search TBD at G5 start)

---

## 3. SPEC vs 현실 drift (의심점)

### Admin admin is Phase 1.1 pattern (SPEC §3 G5 Task 6 resolved)
- SPEC explicitly states admin gate uses `is_yagi_admin(auth.uid())` RPC, not a new `profiles.role='admin'` value
- PRE-1 impact: G5 reads `user_roles` via the RPC — **no collision with `profiles.role`** at G5. Admin gate is Phase 1.1 territory end-to-end. ✅

### JSONB form UX is net-new
- No existing JSONB-building form in codebase → risk of ad-hoc pattern becoming first-draft permanent.
- Recommendation: start simple (static layout per submission type; fold/unfold sub-config via checkbox state), defer fancy schema editor to Phase 2.6.

### State-machine validity is not DB-enforced
- G1 migration's `challenges.state` has a CHECK constraint for valid values, but NOT for valid **transitions** (e.g., can't go from `draft` directly to `closed_announced`).
- Transition rules live ONLY in the Server Action.
- Risk: a direct DB UPDATE via service-role client can still bypass. For MVP, acceptable. Document as known-gap for Phase 2.6 (DB trigger or RPC-only updates).

### Winner-announce → notification fan-out
- SPEC §3 G7 Task 2: `challenge_announced_winner` for winners, `_participant` for others
- G5 announce action must enumerate all submissions for the challenge, classify each as winner/participant, emit notification per row
- **Fan-out size risk:** 100 submissions = 100 notification_events INSERTs in one transaction
- Recommendation: async via cron-picker OR background worker. Or accept synchronous INSERT + batch email via notify-dispatch's existing batching.

### Admin UI design-system compliance
- Admin pages are internal — typically less visually scrutinized
- But X1 audit flagged status pills across admin pages (CRITICAL #3, #9)
- Post-ade027f: `src/lib/ui/status-pill.ts` centralized — G5 challenge state pills must use this
- G5 is the first page to consume 5-state challenge semantic pills — likely needs to extend `status-pill.ts` with challenge-specific variants. Verify existing kinds registered.

### Slug editability after create
- SPEC says slug editable at creation, but once publications/submissions exist, slug changes break URLs
- Recommendation: disable slug edit once state != 'draft'
- Add to G5 edit form logic

---

## 4. 외부 의존 / ENV prereq

- No new ENV vars.
- Admin announce action emits notifications → requires Resend API key operational (already confirmed Phase 2.1).

---

## 5. 테스트 전략 권고

| Layer | Scope | Pattern |
|---|---|---|
| Unit | `state-machine.ts` allowed-transitions | `.mjs` or vitest |
| Unit | `submission_requirements` JSONB round-trip (form state → JSONB → form state) | vitest |
| Unit | Winner calc for public_vote / hybrid modes | vitest |
| Integration | Admin Server Actions enforce `is_yagi_admin` — anon/non-admin call → 403 | Supabase client tests |
| Integration | Announce action fan-out (N submissions → N notifications + N email queue entries) | Asserting row counts |
| E2E | Full admin workflow: create → edit → open → close → judge → announce | Manual smoke |
| Manual QA | 10-submission sample challenge with hybrid judging | YAGI-MANUAL-QA-QUEUE entry |

---

## 6. 잠재 야기 결정 항목

1. **First admin bootstrap** — SQL seed vs manual INSERT via SPEC §6 Q1's env-var pattern. Pick and commit bootstrap SQL at G1 follow-up (FU-4).
2. **Slug lock policy** — editable forever, or lock after draft→open transition? Recommend lock.
3. **Fan-out delivery** — synchronous notification INSERTs vs async batch? Recommend sync INSERT + trust notify-dispatch batching.
4. **Hybrid weight default** — 70% admin / 30% public sufficient? Make it slider-editable per challenge.
5. **Judging UI density** — for 50+ submissions, does the judge page need pagination/virtualization? MVP: simple list, defer virtualization.
6. **State transition audit** — should `challenges` have separate `state_transitions` audit table, or rely on `updated_at` + `announced_at` timestamps? MVP: skip separate audit; timestamps sufficient.
7. **Winner rank** — tie allowance? Multiple #1s? Recommend unique rank within challenge via UNIQUE (challenge_id, rank).

---

**Cross-ref:** Does NOT touch PRE-1 — admin gate is Phase 1.1 domain. SPEC §3 G5 Task 5 winner fan-out → cross-ref with G7.
