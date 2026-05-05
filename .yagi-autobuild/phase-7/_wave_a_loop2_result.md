# Phase 7 Wave A — LOOP-2 Result

Date: 2026-05-05
Branch: g-b-10-phase-7
Base HEAD: 10034c22

---

## Inline Fixes Applied

### K-05 LOOP-1 — F1 MED-A: JSONB server-side Zod validation

**File:** `src/app/[locale]/app/admin/campaigns/_actions/campaign-actions.ts`

Added Zod schemas before any DB write:

- `ReferenceAssetSchema`: `{ url: z.string().url(), label: z.string().min(1).max(200) }`
- `ReferenceAssetsSchema`: `z.array(ReferenceAssetSchema).max(20)`
- `CompensationMetadataBaseSchema`: `z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))` — flat only, no nested objects
- `validateCompensationMetadata()`: helper that enforces base schema + fixed_fee model constraint (`fixed_fee_per_creator: z.number().positive()` required when model is `"fixed_fee"`)

Applied to both `createCampaignAction` and `updateCampaignAction` before service-role DB write. Zod v4 two-arg `z.record()` syntax used.

---

### K-06 LOOP-1 — F1 HIGH: ChannelBadge sage-only (neutral chip)

**File:** `src/app/campaigns/[slug]/page.tsx`

Removed entire `colorMap` record with platform-tinted backgrounds:
- instagram: `bg-gradient-to-r from-purple-500 to-pink-500`
- youtube: `bg-red-600`
- youtube_shorts: `bg-red-500`
- tiktok/x: `bg-black`

Replaced with single neutral chip: `bg-muted text-foreground border border-border`
Channel text labels preserved verbatim. `channel` prop kept in type signature for callers.

---

### K-06 LOOP-1 — F2 HIGH: word-break-keep-all → keep-all

**Files:**
- `src/app/campaigns/page.tsx` (4 occurrences)
- `src/app/campaigns/[slug]/page.tsx` (8 occurrences)

`word-break-keep-all` is not a defined Tailwind utility; `.keep-all` is the correct custom utility from `globals.css:185`. All 12 occurrences replaced via `replace_all`.

---

### K-06 LOOP-1 — F4 HIGH: Q2 워딩 lock — 유포 중 / Distributing

**Files:**
- `messages/ko.json` — `public_campaigns.status.distributing`: `"유포 중"` → `"공개 진행 중"`
- `messages/en.json` — `public_campaigns.status.distributing`: `"Distributing"` → `"Showcasing"`

DB enum value `'distributing'` unchanged (machine-readable). Matches showcase title "공개된 작품" theme.

---

## Deferred to FOLLOWUPS.md

14 items registered in `.yagi-autobuild/phase-7/FOLLOWUPS.md` (file created):

| ID | Severity | Description |
|---|---|---|
| FU-Phase7-A-K06-F3 | HIGH | Showcase asymmetric grid redesign |
| FU-Phase7-A-K06-F5 | MED | Hero subhead on /campaigns list |
| FU-Phase7-A-K06-F6 | MED | H1 font-display italic on detail page |
| FU-Phase7-A-K06-F7 | MED | 응모하기 CTA prominence |
| FU-Phase7-A-K06-F8 | MED | /campaigns/[slug]/submit → 404 (Wave C.1) |
| FU-Phase7-A-K06-F9 | MED | Inline hex #71D083 → bg-sage utility |
| FU-Phase7-A-K06-F10 | MED | tracking-wide on KO labels |
| FU-Phase7-A-K06-F11 | MED | Status filter only 6/8 statuses (Wave B) |
| FU-Phase7-A-K06-F12 | MED | Cancel vs delete labeling |
| FU-Phase7-A-K06-F13 | MED | Category edit/delete missing |
| FU-Phase7-A-K06-F14 | LOW | Hardcoded "편집" string |
| FU-Phase7-A-K06-F15 | LOW | Form placeholders not localized |
| FU-Phase7-A-K06-F16 | LOW | StatusBadge raw enum render |
| FU-Phase7-A-K06-F17 | LOW | Hex literal in border |

---

## Verification

- `pnpm exec tsc --noEmit`: CLEAN (0 errors)
- `pnpm lint` (changed files only): CLEAN (0 errors, 0 warnings)
- Global lint exit code 1 due to pre-existing issues in OTHER worktrees (.claude/worktrees/*) — not in scope of this commit

---

## Status: COMPLETE
