# Phase 1.6 — Public landing + MDX journal — SUMMARY

**Status:** ✅ Shipped clean (Codex K-05 HIGHs all addressed)
**Date:** 2026-04-22
**Build:** `pnpm tsc --noEmit` exit 0 / `pnpm build` exit 0

## What shipped

A bilingual public landing page and journal at the root locale (`/ko`, `/en`) plus
content infrastructure (Content Collections + MDX), feed/sitemap, and OG image
endpoint. Editorial print-magazine voice — no images, no gradients, no warm tones,
pill CTAs, Fraunces italic for emphasis, hairline rules.

### Wave inventory

- **Wave A — Content Collections + i18n foundations**
  - `content-collections.ts` at repo root with Zod schema and derived fields
    (`slug`, `mdx_body`, `word_count`, `read_minutes`)
  - Two seed posts: `content/journal/2026/welcome-to-yagi-workshop.{mdx,en.mdx}`
  - `next.config.ts` wrapped with `withContentCollections`
  - `tsconfig.json` path mapping `"content-collections": ["./.content-collections/generated"]`
  - `.gitignore` excludes `.content-collections/`
  - Installed `@content-collections/core@0.15.0`, `@content-collections/next@0.2.11`,
    `@content-collections/mdx@0.2.2`
  - 27 new `home.*` keys, 9 new `journal.*` keys, 3 new `about.*` keys (ko + en)

- **Wave B — Hero + services + journal list + feed/sitemap (parallel)**
  - `src/components/home/hero-block.tsx` — full-viewport hero with split typography,
    Fraunces italic emphasis, optional vertical hairline, ordinal eyebrow
  - `src/components/home/services-triad.tsx` — three-column with vertical dividers,
    `01 ·`/`02 ·`/`03 ·` ordinal markers
  - `src/app/[locale]/journal/page.tsx` — year-grouped list, `?tag=` filter,
    locale-scoped, draft-gated
  - `src/app/journal/feed.xml/route.ts` — Atom 1.0, last 20 posts, XML-escaped
  - `src/app/sitemap.ts` — landing + journal-index + posts (initially flat)

- **Wave C — Landing composition (rest of sections)**
  - `src/components/home/approach-block.tsx` — two-column editorial paragraphs
  - `src/components/home/selected-work.tsx` — case-study tiles or 3 fallback
    placeholders + italic "coming soon" note
  - `src/components/home/journal-preview.tsx` — latest 3 posts + "View all" pill
  - `src/components/home/contact-block.tsx` — `id="contact"` for hero CTA anchor,
    big mailto pill, three info rows
  - `src/components/home/site-footer.tsx` — wordmark, sitemap, studio info,
    locale toggle (preserves path via `pathname` prop)
  - `src/components/home/title-emphasis.tsx` — shared helper for Fraunces italic
    on a single emphasis word
  - Wired all sections in `src/app/[locale]/page.tsx`

- **Wave D — Article page + OG image**
  - `src/app/[locale]/journal/[slug]/page.tsx` — SSG via `generateStaticParams`,
    MDX render via `MDXContent`, draft gating via `NODE_ENV`,
    full typography component map, header/footer + "More from the Journal",
    locale-aware date formatting
  - `src/app/api/og/route.tsx` — edge runtime, three themes (default/accent/quote),
    Google Fonts fallback for Fraunces italic 700 + Inter 700/400
    (no `public/fonts/` shipped in repo)

- **Wave E — Codex K-05 review + HIGH fixes**

### Codex K-05 findings + resolutions

**0 CRITICAL.** **5 HIGH** — all addressed in this wave:

| # | Issue | Fix |
|---|---|---|
| HIGH-1 | `metadataBase` unset → relative OG image URLs resolve to `localhost:3000` in production | Set `metadataBase` in `src/app/[locale]/layout.tsx` to `process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz"` |
| HIGH-2 | Article `generateMetadata` had no `alternates.languages` hreflang | Added per-post hreflang map; only declares siblings whose post actually exists; `x-default` points at ko when present |
| HIGH-3 | Sitemap had no hreflang alternates → bilingual content treated as independent pages | Added per-entry `alternates.languages` for landing, journal-index, and per-post (existence-checked) |
| HIGH-4 | Journal list page had no `SiteFooter` → no locale toggle on the most prominent content page | Imported and rendered `<SiteFooter locale={...} pathname="/journal" />` |
| HIGH-5 | Three hardcoded `locale === "ko" ? ... : ...` strings violated CLAUDE.md i18n rule | Extracted to `journal.clear_filter`, `journal.empty_state`, `home.footer_aria_label` in both ko + en messages |

**13 MEDIUM** + **5 LOW** noted but do NOT block ship per autopilot rules.
See deferred follow-ups below.

## Routes registered (Phase 1.6 contribution)

- `ƒ /[locale]` — landing (dynamic, locale-resolved)
- `ƒ /[locale]/journal` — journal list (dynamic; year-grouped, tag-filterable)
- `● /[locale]/journal/[slug]` — article page (SSG, 2 pre-rendered: ko + en welcome)
- `ƒ /journal/feed.xml` — Atom 1.0 feed
- `○ /sitemap.xml` — sitemap with hreflang
- `ƒ /api/og` — edge OG image (three themes, Google Fonts fallback)

## File-level deltas

**Created:**
- `content-collections.ts`
- `content/journal/.gitkeep`
- `content/journal/2026/welcome-to-yagi-workshop.mdx`
- `content/journal/2026/welcome-to-yagi-workshop.en.mdx`
- `src/components/home/hero-block.tsx`
- `src/components/home/services-triad.tsx`
- `src/components/home/approach-block.tsx`
- `src/components/home/selected-work.tsx`
- `src/components/home/journal-preview.tsx`
- `src/components/home/contact-block.tsx`
- `src/components/home/site-footer.tsx`
- `src/components/home/title-emphasis.tsx`
- `src/app/[locale]/journal/page.tsx`
- `src/app/[locale]/journal/[slug]/page.tsx`
- `src/app/journal/feed.xml/route.ts`
- `src/app/sitemap.ts`
- `src/app/api/og/route.tsx`

**Modified:**
- `src/app/[locale]/page.tsx` — full landing composition
- `src/app/[locale]/layout.tsx` — added `metadataBase`
- `next.config.ts` — wrapped with `withContentCollections`
- `tsconfig.json` — added `content-collections` path mapping
- `.gitignore` — added `.content-collections/`
- `messages/ko.json` — +~40 keys across `home.*`, `journal.*`, `about.*`
- `messages/en.json` — mirror of above
- `package.json` + `pnpm-lock.yaml` — added Content Collections + `@vercel/og`

## Deferred follow-ups (Phase 1.6 MEDIUM/LOW)

These are noted in Codex K-05 output but did NOT block ship:

1. **OG cache strategy** — `/api/og` uses `force-dynamic`; consider `revalidate = 3600`
   to amortize Google Fonts fetch (~500ms/request) since post content is immutable
   until republish
2. **Content Collections deprecation warnings** — migrate from `collections` to
   `content` config property, add explicit `content: z.string()` to schema
3. **Robots metadata** — no `MetadataRoute.Robots` exists; search engines crawl
   freely without sitemap-discovery pointer
4. **Dead i18n keys** — `home.headline_before/emphasis/after`, `home.sub`,
   `home.cta_client/creator`, `home.trusted_label`, `home.contact_title`,
   `home.contact_email`, `home.contact_inquiry_link`, `home.footer_copyright`,
   `home.footer_locale_toggle`, plus duplicate `approach_body_p1/2/3` ↔ `approach_p1/2/3` —
   delete to reduce drift risk (kept here in case post-mortem wants the original copy)
5. **Year heading contrast** in journal list (`opacity-20` on black) fails WCAG AA
   even at large-text threshold; decorative but flagged
6. **Atom feed discoverability** — no `<link rel="alternate" type="application/atom+xml">`
   in root layout `<head>`; also feed entries blend ko + en (consider per-locale feeds)
7. **MDX external links** — no `rel="noopener noreferrer"` / `target="_blank"`
   handling for external hrefs
8. **OG quote-theme sentence split** — splits on `. ` only; Korean prose using `다.`
   endings inside paragraphs may truncate at unexpected points; add `。`/`」` and length cap
9. **OG fallback card** hardcodes English tagline even when `locale=ko`; localize
10. **Locale toggle 404** — when current article has no twin in the other locale,
    `<SiteFooter>` toggle routes to a 404; detect and fall back to `/journal` for
    that locale
11. **`translation_slug` schema field** declared but unconsumed — wire up "read in
    ko/en" banner or remove from schema
12. **`package.json` dev port drift** — runs on `:3003`, but CLAUDE.md says `:3001`
    (pre-existing, not Phase 1.6 regression — flag for CLAUDE.md update)
13. **MDX code blocks** — no syntax highlighter wired up

## Mock-mode / production flip

N/A. Phase 1.6 is not mock-gated.

## What's next

- **Phase 1.7** — YAGI internal team chat (planned)
- **Phase 1.8** — Notifications (digest + badges)
- **Phase 1.9** — Deliverable Showcase Mode

## Cross-phase deferred items NOT addressed in 1.6

Tracked in task #24:
- Phase 1.2.5 + 1.3 + 1.4 deferred Codex K-05 items
- Phase 1.5 deferred items
- **NEW CRITICAL:** missing migrations for Phases 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4
  in `supabase/migrations/` (only Phase 1.0 + the newly-committed Phase 1.5 exist
  on disk; the rest are applied to the project but not in repo)
