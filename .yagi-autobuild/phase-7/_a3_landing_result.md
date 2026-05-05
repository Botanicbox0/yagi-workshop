# Wave A.3 — Public campaigns landing + showcase gallery

**Agent**: Claude Sonnet 4.6 (worktree agent-afcc324d4cf200196)
**Date**: 2026-05-05
**Branch**: g-b-10-phase-7

## L-051 Base SHA Verification

```
HEAD: 0454bcc96dee84b0c199f40ffad36d30664ca398
Commit: feat(phase-7/A.1): campaigns + 4 related tables + RLS + column grants
Status: VERIFIED ✓
```

## Files Created

| File | Purpose |
|---|---|
| `src/lib/campaigns/queries.ts` | Server-side Supabase queries scoped to public statuses |
| `src/app/campaigns/layout.tsx` | Locale-free public chrome (KO default, NextIntlClientProvider) |
| `src/app/campaigns/page.tsx` | List page — public campaigns, active/closed sections, empty state |
| `src/app/campaigns/[slug]/page.tsx` | Detail page — hero, brief, references, categories, CTA stub, showcase gallery |

## i18n Keys Added

Namespace: `public_campaigns` — 22 keys total

| Key | KO | EN |
|---|---|---|
| `list_title` | 진행 중인 캠페인 | Active campaigns |
| `list_empty` | 현재 진행 중인 캠페인이 없습니다. | No active campaigns at the moment. |
| `list_empty_subtitle` | 곧 첫 캠페인이 공개됩니다. | First campaign launching soon. |
| `detail.brief_label` | 브리프 | Brief |
| `detail.references_label` | 참고 자료 | Reference materials |
| `detail.categories_label` | 참여 부문 | Categories |
| `detail.submit_cta` | 응모하기 | Submit work |
| `detail.submission_closes_in` | 마감 {time} | Closes in {time} |
| `detail.submission_closed` | 응모 마감 | Submissions closed |
| `detail.showcase_title` | 공개된 작품 | Published works |
| `detail.showcase_empty_for_status` | 응모 마감 후 작품 공개 예정 | Works published after review |
| `detail.channel_tiktok` | TikTok | TikTok |
| `detail.channel_instagram` | Instagram | Instagram |
| `detail.channel_youtube` | YouTube | YouTube |
| `detail.channel_youtube_shorts` | YouTube Shorts | YouTube Shorts |
| `detail.channel_x` | X | X |
| `detail.channel_other` | 기타 | Other |
| `status.published` | 응모 진행 중 | Open for submissions |
| `status.submission_closed` | 응모 마감 | Submissions closed |
| `status.distributing` | 유포 중 | Distributing |
| `status.archived` | 마감 | Archived |

## Wording Cross-Check (yagi-wording-rules)

KO surface values audited — ZERO occurrences of internal-only terms:
- "Sponsor" — NOT present in any KO i18n value ✓
- "Submission" — NOT present in any KO i18n value ✓
- "Track" — NOT present in any KO i18n value ✓
- "Roster" — NOT present in any KO i18n value ✓
- "Distribution" — NOT present in any KO i18n value ✓

Channel labels (TikTok / Instagram / YouTube / X) are brand names, exempt per rules.

## Empty States

| Condition | Behavior |
|---|---|
| `/campaigns` — 0 campaigns | Sage-soft placeholder visual + 캠페인 없음 + 곧 공개 예정 copy |
| `/campaigns/[slug]` — not found | `notFound()` → 404 |
| `/campaigns/[slug]` — no categories | Defensive: section hidden if `categories.length === 0` |
| `/campaigns/[slug]` — showcase status not distributing/archived | Section hidden entirely |
| `/campaigns/[slug]` — distributing/archived but 0 distributions | Placeholder card with `showcase_empty_for_status` copy |

## Design System Applied

- Sage accent: `bg-sage`, `text-sage`, `bg-sage-soft`, `text-sage-ink`
- 24px card radius: `rounded-[24px]` on all cards
- No shadows: zero `shadow-*` classes
- Hero typography: `font-semibold`, `lineHeight: "1.18"`, `letterSpacing: "-0.01em"` (KO Pretendard via CSS variable)
- Showcase gallery: CSS `columns-1 sm:columns-2 lg:columns-3` asymmetric column layout per design-system §"No uniform grids for media"
- `word-break-keep-all` on all Korean text blocks

## RLS Scope

`getCampaignsList()` queries with `.in("status", ["published","submission_closed","distributing","archived"])` — aligns exactly with `campaigns_select_public` RLS policy. Supabase anon key enforces server-side.

`getCampaignDistributions()` only runs for `distributing`/`archived` campaigns, and fetches distributions WHERE parent submission `status='distributed'`.

## Out of Scope (deferred)

- 응모 form `/campaigns/[slug]/submit` — C.1 wave
- Middleware matcher update — A.4 parallel agent
- Locale detection from cookies — defaulting to KO per SPEC

## Verification Results

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | CLEAN (no output) |
| `pnpm lint` — new files | CLEAN (0 new errors/warnings in campaigns files) |
| Pre-existing lint errors | 3181 errors pre-existing (unrelated, tracked separately) |
