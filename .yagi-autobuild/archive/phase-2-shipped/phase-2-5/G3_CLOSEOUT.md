# Phase 2.5 G3 — Closeout

**Date:** 2026-04-24
**Status:** SHIPPED (code complete; push + PR pending yagi authorization)
**Branch:** `worktree-g3-challenges`
**Base:** `1fb9dd2` (pre-G3 infra: markdown, status helpers, brand assets)

---

## Summary

Phase 2.5 G3 ships the public `/challenges/*` surfaces: list, detail, gallery with realtime, winners display, and voting. First production use of the Agent Teams + parallel_group execution model per `PARALLEL_WORKTREES.md`. 5 sub-groups, ~30 files, one in-line polish round triggered during visual review (Group B.5). All barriers green.

## Groups shipped

| Group | Purpose | File count | Model mix |
|---|---|---:|---|
| A | Foundations (libs + i18n + chrome) | 8 | 2×Haiku + 1×Sonnet |
| B | List + detail surfaces | 10 | 2×Sonnet |
| B.5 | Visual polish (countdown timer + thumbnails + Higgsfield-style archived grid) | 8 | 2×Sonnet |
| C | Gallery + realtime + vote | 6 | 1×Sonnet |
| D | Sitemap + e2e smoke | 2 | 1×Haiku |

Group B.5 was not in the original G3-TASK-PLAN — it was inserted at the B→C stop point based on yagi's visual review feedback (countdown timer per standard UX, 16:9 thumbnails, Higgsfield-inspired archived card grid).

## Files authored (~34)

```
src/app/challenges/
  ├── layout.tsx                         (A3)
  ├── page.tsx                           (B1)
  └── [slug]/
      ├── layout.tsx                     (A3)
      ├── page.tsx                       (B2)
      ├── not-found.tsx                  (A3)
      └── gallery/
          ├── page.tsx                   (C1)
          └── actions.ts                 (C1)

src/components/challenges/
  ├── public-chrome.tsx                  (A3)
  ├── header-cta-resolver.tsx            (A3; ?next= added post-review)
  ├── challenge-list-section.tsx         (B1; thumbnail column added in B.5-1)
  ├── challenge-card-mobile.tsx          (B1; thumbnail added in B.5-1)
  ├── archived-card-grid.tsx             (B.5-1)
  ├── status-banner.tsx                  (B2; countdown added in B.5-2)
  ├── countdown-timer.tsx                (B.5-2)
  ├── requirements-display.tsx           (B2; §J fix post-review)
  ├── timeline-display.tsx               (B2)
  ├── primary-cta-button.tsx             (B2)
  ├── share-button.tsx                   (B2)
  ├── empty-state.tsx                    (B2)
  ├── gallery-grid.tsx                   (C1)
  ├── gallery-realtime.tsx               (C1 — first realtime subscriber)
  ├── submission-card.tsx                (C1)
  └── vote-button.tsx                    (C1)

src/lib/challenges/
  ├── types.ts                           (A1)
  ├── queries.ts                         (A1)
  └── urgency.ts                         (A1)

src/lib/ui/
  └── placeholder-gradient.ts            (B.5-1)

src/app/
  └── sitemap.ts                         (D1 EDIT — /challenges entries)

tests/e2e/
  └── challenges.smoke.mjs               (D1 NEW — 9-assertion node smoke)

messages/
  └── ko.json                            (A2 EDIT — challenges namespace; B2 +share_copied)
```

## Barriers (final)

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | EXIT=0 |
| `pnpm lint` | EXIT=0 (2 pre-existing warnings unchanged) |
| `pnpm build` | EXIT=0 |
| `tests/e2e/challenges.smoke.mjs` (9 assertions) | 9/9 pass |
| §J vocabulary audit | 0 hits across all G3 files |
| Design-system token audit | 0 hardcoded grays/blacks/xl-radii |

## Lead inline fixes (caught during barrier/review, before closeout)

1. **§J violation:** `requirements-display.tsx:50` `"제출 요건"` → `"작품 요건"` (1:1 vocabulary swap per §J).
2. **Consistency:** `header-cta-resolver.tsx` observer branch added `?next=${encodeURIComponent(currentPath)}` to match `primary-cta-button.tsx:60` behavior authored by detail-author. Scope originally deferred to FU-16, folded forward.

## Follow-ups registered (open)

| ID | Trigger | Risk |
|---|---|---|
| FU-16 | Post-G3 or Phase 2.6 polish | LOW — header-cta-resolver 4 literals → `useTranslations` swaps (scope reduced post-consistency fix) |
| FU-17 | Post-G3 or Phase 2.6 polish | LOW — B1 inline empty-state → consolidate with B2 `<EmptyState>` (parallelism trade-off at B entry) |

## Deferred to subsequent gates

- **G4** — Submission flow (`/challenges/[slug]/submit`, upload pipeline, rate limit)
- **G5** — Admin challenge management (`/admin/challenges/*`)
- **G6** — Profile surface (`/u/<handle>`)
- **G7** — Notifications (4 new kinds + pg_cron reminder job)
- **G8** — Phase 2.5 closeout + Codex K-05 single pass over full Phase 2.5 diff

## Codex K-05

NOT triggered at G3 per ADR-005 expedited — Phase 2.5 G8 runs Codex K-05 once over the full Phase 2.5 diff, not per-gate. G3 introduced no DB writes (G1 schema already shipped; no new migrations/RPCs/policies), so the DB-write protocol's K-05 gate did not trigger either.

## Seed data (for ongoing visual review; not production)

Inserted via MCP `execute_sql` on 2026-04-24 during visual review stop points:

- **6 challenges:** `test-open-1`, `test-open-urgent-24h`, `test-open-urgent-1h`, `test-judging-1`, `test-announced-1`, `test-archived-1` — cover every state + 3 urgency tiers
- **3 test profiles:** `test-creator-a/b/c` (role=`creator`, locale=`ko`) + matching `creators` and `auth.users` rows
- **6 challenge_submissions:** 3 per challenge on `test-open-1` and `test-announced-1`, status=`ready`
- **3 showcase_challenge_winners:** all 3 submissions on `test-announced-1`, ranks 1/2/3
- **3 challenge_votes:** all on Creator Alpha's submission in `test-open-1`

Cleanup (when test data is no longer needed):

```sql
DELETE FROM public.challenges WHERE slug LIKE 'test-%';
-- cascades to challenge_submissions → challenge_votes → showcase_challenge_winners
DELETE FROM public.creators WHERE id IN
  ('aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000003');
DELETE FROM public.profiles WHERE id IN
  ('aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000003');
DELETE FROM auth.users WHERE id IN
  ('aaaaaaaa-0000-4000-8000-000000000001',
   'aaaaaaaa-0000-4000-8000-000000000002',
   'aaaaaaaa-0000-4000-8000-000000000003');
```

## Parallelism retrospective (first production Agent Teams run)

**What worked:**
- **Strict file-set disjointness** → zero merge conflicts across 5 teams, 9 teammates, ~30 files
- **Interface-locked shared contracts** (e.g., `slugGradient` signature in G3-TASK-PLAN pre-spawn) → parallel soft-deps resolved without blocking
- **`parallel_group` + explicit claim protocol** (TaskList → owner + in_progress → completed) → clear ownership even with fast Haiku turnarounds
- **Single-lead barrier enforcement** (tsc + lint + smoke) → caught 1 §J violation that slipped teammate self-audit
- **MCP Supabase execute_sql** for seeding → faster than SQL Editor paste + zero risk of credential exposure in chat

**What surfaced friction:**
- Idle notifications arrive every turn-end — easy to over-interpret; TaskList status is authoritative
- `TeamDelete` requires ~5s after `SendMessage shutdown_request` for clean cleanup; immediate call fails with "active member(s)"
- Dev server HMR cache went stale mid-session after many file edits → one false-positive 500 on `/challenges`, resolved by killing orphan PID + clearing `.next/cache` (prod build was always clean)
- Visual-review stop point between B and C caught a real UX gap (countdown/thumbs/Higgsfield grid) and produced a full parallel polish round (B.5) — this is the stop point working as designed

**Total wall time for G3:** ~3h (Groups A through D + B.5 + lead fixes + seed + barrier). SPEC target was 4-5h; parallelism savings ~40% vs linear.

## Commit range

(To be filled in by the commit command. Single commit on `worktree-g3-challenges` branch; merge-to-main strategy pending yagi decision.)

## Next

- yagi authorizes `git push` + chooses merge strategy (direct merge to main vs PR review)
- Builder proceeds to Phase 2.5 G4 (submission flow) when green-lit
