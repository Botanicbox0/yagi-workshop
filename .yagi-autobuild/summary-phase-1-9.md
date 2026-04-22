# Phase 1.9 — Deliverable Showcase Mode — SUMMARY

**Status:** ✅ SHIPPED. Codex K-05 0 CRITICAL + 2 HIGH (both fixed in-wave) + 5 MEDIUM + 4 LOW (deferred).
**Date:** 2026-04-22
**Build:** `pnpm tsc --noEmit` exit 0; `pnpm build` exit 0; 11 static pages, `/showcase/[slug]` dynamic, `/api/showcases/[id]/og` edge runtime
**🎉 Autopilot chain complete.**

## What shipped

A public portfolio surface per project with:
- Slug-addressable public viewer at `/showcase/[slug]` (locale-free, service-role bypass)
- Admin editor at `/[locale]/app/showcases` (list + editor) — metadata, narrative markdown, media grid (@dnd-kit reorder), cover picker, credits, badge control, password gating, publish checklist
- OG image auto-rendered per showcase (1200×630, Fraunces italic + Inter, via @vercel/og at edge runtime, cached in public `showcase-og` bucket)
- Landing "Work" section on Phase 1.6 landing + `/[locale]/work` index with pagination
- Sitemap extended for published showcases
- YAGI badge (bottom-center of viewer, links to `yagiworkshop.xyz/?ref=showcase-{slug}`) with workspace-admin request → yagi-admin approve/deny workflow
- Optional bcrypt(12) password gating with httpOnly 24h unlock cookie
- View count tracked with atomic RPC increment + 24h cookie dedupe
- Phase 1.8 `showcase_published` notification emitted on publish

### Wave inventory

- **Wave A — i18n + migration + 13 Server Actions (parallel)**
  - 92 keys under `showcase.*` namespace (ko + en — admin list/editor/badge/password/publish + public viewer/password/made-with-yagi + landing work + /work index)
  - Migration `20260422100000_phase_1_9_showcases.sql` — 2 tables (`showcases`, `showcase_media`) + 8 RLS policies (explicit `auth.uid()` form) + 4 indexes + `tg_set_updated_at` trigger + 2 storage buckets (`showcase-media` private, `showcase-og` public) + storage RLS policies
  - `src/app/[locale]/app/showcases/actions.ts` — 13 Server Actions: `createShowcaseFromBoard`, `publishShowcase`, `unpublishShowcase`, `requestBadgeRemoval`, `approveBadgeRemoval`, `denyBadgeRemoval`, `setShowcasePassword`, `updateShowcase`, `addShowcaseMedia`, `removeShowcaseMedia`, `reorderShowcaseMedia`, `setShowcaseCover`, `requestShowcaseUploadUrls`
  - `database.types.ts` regenerated (1815 lines)

- **Wave B — admin editor + OG image (parallel)**
  - `src/app/[locale]/app/showcases/page.tsx` — list page (yagi_admin OR ws_admin access)
  - `src/app/[locale]/app/showcases/[id]/page.tsx` — editor page with canPublish/canManageBadge/canManagePassword role flags
  - `src/components/showcases/showcase-editor.tsx` — client editor (metadata + cover + narrative + reorderable media + credits + badge + password + publish checklist)
  - `src/components/showcases/create-from-board-dialog.tsx` — approved-boards picker for yagi_admin
  - `src/app/api/showcases/[id]/og/route.tsx` — edge runtime, Fraunces italic + Inter from Google Fonts CSS API, cover background with dark overlay, 1y CDN cache, 302 redirect on cache hit

- **Wave C — public viewer + landing integration (parallel)**
  - `src/app/showcase/[slug]/{page,actions,password-prompt,layout,not-found,resolve-locale}.tsx` — locale-free viewer with password gating + view increment + editorial layout (Fraunces italic title, media grid, YAGI badge)
  - `src/components/marketing/work-section.tsx` — landing Work section (service-role query, signed URLs, 3/2/1 col grid)
  - `src/app/[locale]/work/page.tsx` — public locale-aware index with offset pagination (page size 24) + generateMetadata with hreflang
  - `src/app/[locale]/page.tsx` modified — WorkSection mounted between SelectedWork and JournalPreview; revalidate=300
  - `src/app/sitemap.ts` extended — async + `/work` (both locales) + per-showcase entries (locale-free) via service-role query

- **Wave D — Codex K-05 review + HIGH fixups + final build**

### Codex K-05 findings + resolutions

**0 CRITICAL.** **2 HIGH — both addressed in this wave:**

| # | Severity | Issue | Fix |
|---|---|---|---|
| H1 | HIGH | `showcases_update_internal` RLS had no `WITH CHECK` — ws_admin with browser devtools + anon key could rewrite `project_id` to a foreign workspace (showcase theft) | Migration `20260422110000_phase_1_9_showcases_fixups.sql` drops + recreates policy with matching WITH CHECK predicate |
| H2 | HIGH | View-count increment was a non-atomic SELECT+UPDATE — concurrent viewers (viral shares) lose 30-70% of increments | Same fixup migration adds `public.increment_showcase_view(sid uuid)` SECURITY DEFINER RPC doing single `UPDATE ... SET view_count = view_count + 1 RETURNING view_count`; EXECUTE grant to anon + authenticated; actions.ts replaced with single `supabase.rpc("increment_showcase_view", { sid })` call |

**5 MEDIUM + 4 LOW** noted but do NOT block ship.

### Deferred follow-ups (Phase 1.9 MEDIUM/LOW)

1. **M1** — Caption edits in admin editor are client-local only; need `updateShowcaseMediaCaption` action
2. **M2** — `addShowcaseMedia` Zod doesn't enforce `embed_provider` only for `video_embed`; also needs DB CHECK `embed_provider IS NULL OR media_type = 'video_embed'`
3. **M3** — `isAllowedEmbedUrl` host matching permits any subdomain of allowed hosts (e.g. `evil.youtube.com`) — tighten to exact host list
4. **M4** — OG endpoint UUID shape check is loose (`[0-9a-f-]{32,36}`) — use strict UUID regex
5. **M5** — `/work` pagination silently OOBs past last page — clamp or redirect to last valid page
6. **L1** — Draft slug collision (1-in-4B) not retry-handled
7. **L2** — `requestBadgeRemoval` logs reason to Vercel log drain; future audit-table migration
8. **L3** — Unused `locale` param in `renderEmpty` helper in showcases/page.tsx
9. **L4** — YouTube Shorts URLs don't match `watch?v=` rewrite; falls back to link card but broken iframe state possible

### RLS/security surface — Codex-verified

- All five public read paths filter `status='published'` (page, og route, work-section, /work, sitemap)
- `approveBadgeRemoval` records both `badge_removal_approved_at` + `badge_removal_approved_by`
- `createShowcaseFromBoard` does NOT auto-fill `client_name_public`
- bcryptjs.compare is constant-time; rounds=12
- Password unlock cookie httpOnly + sameSite=lax + secure-in-prod
- Inline markdown renderer HTML-escapes first, only `https?:` URLs in hrefs (no `javascript:`)
- `reorderShowcaseMedia` validates media IDs belong to target showcase
- Upload `storagePath` must start with `{showcaseId}/` (cross-showcase attachment blocked)
- `updateShowcase` forbids ws_admin from toggling `made_with_yagi` (yagi-admin only)
- OG bucket public (correct for social); media bucket private (correct)
- `showcases_update_internal` now has matching `WITH CHECK` (H1 fix)
- `increment_showcase_view` RPC filters `status='published'` — drafts can't be incremented

## Routes registered (Phase 1.9 contribution)

- `ƒ /[locale]/app/showcases` — admin list page
- `ƒ /[locale]/app/showcases/[id]` — admin editor page
- `ƒ /showcase/[slug]` — public viewer (locale-free, dynamic)
- `ƒ /[locale]/work` — public index (paginated)
- `ƒ /api/showcases/[id]/og` — OG image (edge runtime)

Plus `/[locale]/` landing modified + `/sitemap.xml` extended.

## File-level deltas

**Created (source):**
- `src/app/[locale]/app/showcases/actions.ts`
- `src/app/[locale]/app/showcases/page.tsx`
- `src/app/[locale]/app/showcases/[id]/page.tsx`
- `src/components/showcases/showcase-editor.tsx`
- `src/components/showcases/create-from-board-dialog.tsx`
- `src/app/api/showcases/[id]/og/route.tsx`
- `src/app/showcase/[slug]/page.tsx`
- `src/app/showcase/[slug]/actions.ts`
- `src/app/showcase/[slug]/password-prompt.tsx`
- `src/app/showcase/[slug]/layout.tsx`
- `src/app/showcase/[slug]/not-found.tsx`
- `src/app/showcase/[slug]/resolve-locale.ts`
- `src/components/marketing/work-section.tsx`
- `src/app/[locale]/work/page.tsx`

**Created (migrations):**
- `supabase/migrations/20260422100000_phase_1_9_showcases.sql`
- `supabase/migrations/20260422110000_phase_1_9_showcases_fixups.sql`

**Modified:**
- `src/app/[locale]/page.tsx` — WorkSection mounted + revalidate=300
- `src/app/sitemap.ts` — async + /work + per-showcase entries
- `src/lib/supabase/database.types.ts` — regenerated (includes `showcases`, `showcase_media`, `increment_showcase_view` RPC)
- `messages/{ko,en}.json` — +92 keys under `showcase.*` (admin + viewer + landing + /work index)
- `package.json` + `pnpm-lock.yaml` — added `slugify`, `bcryptjs`, `@types/bcryptjs` (@vercel/og already from Phase 1.6)

## Mock-mode / production flip

N/A. Phase 1.9 is real-data end-to-end. OG images generate lazily on first request (which NULLs the cached fields on publish).

## What's next

**Autopilot chain complete.** Per spec line 256: "No further Autopilot transition — Yagi manually decides next step (Phase 2.0+)."

Recommend 2.0 backlog grooming based on:
- Phase 1.5 POPBILL mock → live switch (when popbill 승인 lands)
- Phase 1.8 ops blockers (Resend secret + notify-dispatch cron schedule — manual ops steps required before live email dispatch works)
- Cross-phase deferred Codex K-05 items (task #24) — especially missing migrations for Phases 1.1/1.2/1.2.5/1.3/1.4 (only 1.0/1.5/1.6/1.7/1.8/1.9 on disk)
- Phase 1.9 M1-M5 + L1-L4 (caption persistence, embed host tightening, /work OOB clamp, etc.)

## Cross-phase deferred items NOT addressed in 1.9

Tracked in task #24:
- Phase 1.2.5 + 1.3 + 1.4 deferred Codex K-05 items
- Phase 1.5 deferred items (+ POPBILL live switch)
- Phase 1.6 deferred items
- Phase 1.7 deferred items
- Phase 1.8 ops blockers (Resend secret + cron schedule) + deferred MEDIUM/LOW
- Phase 1.9 deferred MEDIUM/LOW (listed above)
- **CRITICAL:** missing migrations for Phases 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4 in `supabase/migrations/` (only Phase 1.0 + 1.5 + 1.6 + 1.7 + 1.8 + 1.9 exist on disk)
