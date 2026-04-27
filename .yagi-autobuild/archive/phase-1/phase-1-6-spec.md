# YAGI Workshop — Phase 1.6 Autonomous Build (B-O-E)

> **Scope:** Public landing page at `/[locale]` + MDX-powered journal at `/[locale]/journal` + per-article OG images. This is the outside face of YAGI Workshop.
> **Prereq:** Phase 1.2 (for brand context). Can ship any time after 1.2 — decoupled from 1.3/1.4/1.5.
> **Estimated duration:** 3–4 hours.
> **Design decisions:** ARCHITECTURE.md §3 (route structure), §8.1–8.4 (none of them affect this phase directly).

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md` + `.claude/skills/yagi-nextjs-conventions/SKILL.md`. This phase is the most design-heavy — if a frontend-design skill is available, load it too.

Session: `--dangerously-skip-permissions`. Fewer kill-switches this time (no external APIs).

---

## Goal

By the end of Phase 1.6:

1. Unauthenticated visitors landing on `yagiworkshop.xyz` get a distinctive, editorial landing page
2. The landing page explains YAGI's three service axes (AI Twin / Branding & IP / Content Production) without generic SaaS aesthetic
3. A public MDX journal at `/journal` lists articles; `/journal/[slug]` renders each
4. Every article has an auto-generated OG image (1200×630) with the article title + YAGI branding
5. RSS/Atom feed at `/journal/feed.xml`
6. Sitemap at `/sitemap.xml`
7. The landing page respects the existing design system from Phase 1.0.6 — no new tokens invented

**Non-goals:**
- CMS — content is MDX files in the repo, committed via git
- Commenting on articles — link to external (e.g., Twitter/X discussion) if wanted
- Search across articles — not enough content yet for it to matter
- Multi-author — `author: '야기'` default, overridable per article
- Newsletter signup — defer; Resend audience + forms is trivial to add later

---

## Content pipeline choice

Per ARCHITECTURE.md §1.3 we're already on pnpm + Zod. The cleanest modern choice is **Content Collections** (`@content-collections/core` + `@content-collections/next` + `@content-collections/mdx`). Rationale:

- Uses Zod schemas (already a core dep)
- Next.js 15 App Router + RSC native
- Drop-in successor to deprecated Contentlayer
- Generates type-safe data — our TS strict mode gets to keep being strict
- Velite is a close alternative but has more bespoke concepts (loaders, hooks) — Content Collections stays boring

Install:
```powershell
pnpm add -D @content-collections/core @content-collections/next @content-collections/mdx
```

🛑 **KILL-SWITCH before install.**

Configure via `content-collections.ts` at repo root.

---

## Data model (file layout, not DB)

```
content/
  journal/
    2026/
      welcome-to-yagi-workshop.mdx
      behind-the-scenes-flux-kontext.mdx
    _meta.ts              # optional shared metadata
```

MDX frontmatter schema (Zod):

```typescript
{
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  publishedAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  locale: z.enum(['ko','en']).default('ko'),
  translation_slug: z.string().optional(),  // for linking ko ↔ en versions
  tags: z.array(z.string()).default([]),
  author: z.string().default('야기'),
  cover_image: z.string().optional(),       // relative to the mdx file
  draft: z.boolean().default(false),
  og_theme: z.enum(['default','accent','quote']).default('default'),
}
```

Drafts (`draft: true`) never render in production; visible in dev mode only.

---

## Design direction for the landing page

The design must be **opinionated and weird** — anti-generic-SaaS. Reference aesthetic: A24 + Linear + a touch of editorial fashion magazine. From the YAGI design system (Phase 1.0.6):

- White/black only — accent lime `#C8FF8C` used maybe once (hover state or tag highlight)
- Pretendard Variable body + Fraunces italic for pull quotes / emphasis
- Keep-all Korean linebreaks
- NO carousels, NO "hero illustration of cartoon people using laptops", NO testimonials in pastel cards
- Single scroll page, 5–7 sections total
- Generous whitespace — Section padding minimum `py-32` on desktop

Section outline (Builder picks sub-details but this is the skeleton):

1. **Hero** — big typographic statement, no image. Something like:
   > 야기워크숍은 독립 아티스트를 위한 AI 네이티브 엔터테인먼트 스튜디오입니다.
   with Fraunces italic on "AI 네이티브". CTA: "문의하기" → scroll to contact section (or mailto).
2. **What we do** — three columns (AI Twin / Branding & IP / Content Production), each with 1 paragraph + 2 example deliverables as small thumbnails
3. **Approach** — one long paragraph (editorial voice) about the YAGI method. No bullets.
4. **Selected work** — 3–5 case study tiles. For MVP, placeholder tiles linking to journal articles that describe past work. Replace with real case study pages in Phase 2.
5. **Journal preview** — latest 3 published articles from `/journal`
6. **Contact** — mailto + social links. No form (too spammy for this stage).
7. **Footer** — minimal. Logo + copyright + language toggle.

**Do not** use:
- Animated "AI" particles / generative backgrounds on the hero
- Video backgrounds (heavy, distracting)
- Stock photos
- Linear-style gradient blobs
- "Trusted by" logo marquee (we have no logos worth showing yet)

---

## Subtasks (9)

### 01 — Content Collections setup

🛑 **KILL-SWITCH before `pnpm add -D @content-collections/*`.**

Files to create:
- `content-collections.ts` at repo root with the Zod schema above
- `content/journal/.gitkeep`
- `content/journal/2026/welcome-to-yagi-workshop.mdx` — a seed article in Korean with basic frontmatter + 3 paragraphs of placeholder body
- `content/journal/2026/welcome-to-yagi-workshop.en.mdx` — same article translated to English (linked via `translation_slug`)
- `next.config.ts` wrap with `withContentCollections`
- `tsconfig.json` add path mapping `"content-collections": ["./.content-collections/generated"]`
- `.gitignore` add `.content-collections/`

Acceptance:
- `pnpm dev` starts clean
- The generated collection is type-accessible: `import { allJournalPosts } from 'content-collections'` works
- Two seed posts are discoverable

---

### 02 — i18n: `home` + `journal` + `about` namespaces

Add to both `messages/ko.json` and `messages/en.json`.

`home`:
- hero_line_1, hero_line_2_emphasis, hero_line_3, hero_cta
- what_title, what_intro
- service_aitwin_title, service_aitwin_desc
- service_branding_title, service_branding_desc
- service_content_title, service_content_desc
- approach_title, approach_body_p1, approach_body_p2, approach_body_p3
- work_title, work_intro
- journal_preview_title, journal_preview_view_all
- contact_title, contact_email, contact_inquiry_link
- footer_copyright, footer_locale_toggle

`journal`:
- list_title, list_intro
- published_at_label, read_more
- article_by, article_tags
- translation_available, translation_this_page
- feed_link_label

`about` (bonus if time): simple /about page. Skip if tight on time.

Korean tone for this namespace: slightly more literary and less 존댓말-formal. Editorial.

---

### 03 — Landing page: hero + what we do

File: `src/app/[locale]/page.tsx` — Server Component.

Implement the hero section and "What we do" section per the design direction above.

Design tokens hard-wired:
- Hero: full viewport, `py-40` top/bottom, center-aligned text
- Hero typography: `text-[clamp(2.5rem,8vw,6rem)]` for main line, Fraunces italic on the emphasis word
- "What we do" grid: 3 columns on desktop, stacked on mobile, with dividers between

Sub-components (Server): `hero-block.tsx`, `services-triad.tsx`.

Acceptance:
- Renders at `/ko` and `/en`
- Mobile layout works at 375px viewport
- Lighthouse accessibility score > 95

---

### 04 — Landing page: approach + work + journal preview + contact

Continue `page.tsx` with remaining sections.

"Selected work": query the journal collection for posts tagged `case-study`, render first 3. If fewer than 3, render generic tiles pointing to `/journal`.

"Journal preview": query published posts, order by `publishedAt desc`, take 3.

"Contact": plain `<a href="mailto:hello@yagiworkshop.xyz">` with the email address in display text (it's a spam magnet but we live in an era of good spam filters).

Acceptance:
- All sections render with real content from the MDX collection
- Links work
- No client-side JS needed for this page (everything is Server Component)

---

### 05 — Journal list page

File: `src/app/[locale]/journal/page.tsx` — Server Component.

Layout:
- Top: editorial page title + intro paragraph
- List: chronological reverse, grouped by year
- Each item: cover image (if present, otherwise nothing — no placeholder), title, subtitle, date, tags as chips, read time (estimated from word count — crude `word_count / 250` min)
- Click → /journal/[slug]

Filter by tag (query param `?tag=foo`) — simple, no fancy state management.

Pagination: none needed for MVP (< 20 articles).

Acceptance:
- List renders correctly with seed posts
- Tag filter works
- Language-scoped (Korean page shows Korean posts; English page English posts)
- Accessible (proper heading hierarchy)

---

### 06 — Journal article page

File: `src/app/[locale]/journal/[slug]/page.tsx` — Server Component.

Layout:
- Top: optional cover image (full-bleed)
- Metadata block: title, subtitle, date, tags, author, read time
- Body: MDX rendered with typography scale (prose styles)
- Bottom: "If the other language version exists, link to it" + "Back to journal" link

MDX components available in articles:
- `<Figure src="..." caption="..." />` — for inline images
- `<Callout type="note|warn">` — for editorial asides
- `<Quote>` — for pull quotes (Fraunces italic, oversized)

Code blocks: use `rehype-pretty-code` or `shiki` for syntax highlighting. 🛑 **KILL-SWITCH before adding the dep.**

Acceptance:
- Article renders with typography scale applied
- Images in the article resolve correctly (relative paths via Content Collections)
- Shift-reload the article → no hydration warnings
- Translation link works if both ko/en versions exist

---

### 07 — OG image generation

File: `src/app/journal/[slug]/opengraph-image.tsx`

Use `@vercel/og` (already in deps from Phase 1.0 / 1.2) — **no new dep needed**.

```typescript
import { ImageResponse } from 'next/og'
import { allJournalPosts } from 'content-collections'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: { slug: string }}) {
  const post = allJournalPosts.find(p => p.slug === params.slug)
  if (!post) return new Response('Not found', { status: 404 })

  return new ImageResponse(
    <div style={{ /* YAGI brand composition */ }}>
      {/* title + subtitle + "YAGI Workshop Journal" */}
    </div>,
    { ...size, fonts: [/* Pretendard + Fraunces loaded from public/fonts */] }
  )
}
```

Three OG themes per frontmatter `og_theme`:
- `default`: white bg, black text, small logo bottom-right
- `accent`: lime `#C8FF8C` horizontal band across 1/3, rest white, black text
- `quote`: title in Fraunces italic, large, centered, off-black bg `#0A0A0A` with white text

Fonts embedded from `public/fonts/*.woff2` — commit the Pretendard + Fraunces subsets to avoid remote font fetch at edge runtime.

Also: landing page OG image at `src/app/opengraph-image.tsx` — generic YAGI card.

Acceptance:
- Article OG image renders correctly at the URL `https://yagiworkshop.xyz/journal/{slug}/opengraph-image`
- `meta` tags include `og:image` pointing to this URL (Next 15 does this automatically if the file exists)
- Font rendering works (Korean characters visible)
- Previewed in Facebook/Twitter debugger shows correctly

---

### 08 — RSS/Atom feed + sitemap

Files:
- `src/app/journal/feed.xml/route.ts` — returns Atom XML for the journal (all languages, or two separate feeds `feed.xml` and `feed.en.xml` — pick Atom 1.0, it's better specified than RSS 2.0)
- `src/app/sitemap.ts` — Next 15 native sitemap convention

Feed content: latest 20 posts, with title, link, summary (first 200 chars of body), pub_date, author.

Sitemap: all journal posts + `/` + `/journal` for both locales. Set `changeFrequency` to `weekly`, `priority` 0.8 for articles, 1.0 for the landing.

Acceptance:
- `/journal/feed.xml` validates at a feed validator
- `/sitemap.xml` validates at Google Search Console
- Both include the seed posts

---

### 09 — E2E + summary

File: `.yagi-autobuild/phase-1-6-e2e.md`

Runbook:
1. `/ko` — hero renders, all sections scroll cleanly
2. `/en` — same
3. Click "Journal" in nav → list
4. Click a seed article → renders
5. Check OG image by pasting URL to Twitter's Card Validator
6. Fetch `/journal/feed.xml` → valid Atom
7. Mobile smoke: at 375px viewport, nothing overflows
8. Add a draft MDX (`draft: true`) locally → confirm it appears in dev but not in `pnpm build` output
9. `pnpm build` (🛑 kill-switch)
10. `summary-1-6.md`
11. Telegram: `✅ Phase 1.6 complete — public landing live.`

---

## Dependencies

```powershell
pnpm add -D @content-collections/core @content-collections/next @content-collections/mdx
# conditionally, if subtask 06 wants code highlighting:
pnpm add -D rehype-pretty-code shiki
```

🛑 **KILL-SWITCH** before each install.

No new runtime deps — `@vercel/og` and everything else already present.

---

## Parallelism plan

```
Wave A: 01 (Content Collections) ‖ 02 (i18n)
   ↓
Wave B: 03 (hero + services) ‖ 05 (journal list) ‖ 08 (feed + sitemap)
   ↓
Wave C: 04 (other landing sections, needs 03 + 05 for journal preview query)
   ↓
Wave D: 06 (article page) → 07 (OG images, needs article page URL shape)
   ↓
Wave E: 09 (E2E)
```

Context reset checkpoints: after B and D.

## Kill-switch triggers (4)

1. Before `pnpm add -D @content-collections/*` (subtask 01)
2. Before `pnpm add -D rehype-pretty-code shiki` IF article page needs code highlighting (subtask 06; conditional)
3. Before final `pnpm build`
4. Before declaring Phase complete

## Success criteria

1. `pnpm build` clean, zero warnings
2. Landing page renders distinctively (Yagi-style) in both languages
3. Two seed articles render at `/ko/journal/{slug}` and `/en/journal/{slug}`
4. OG images generate correctly, valid in link unfurlers
5. Feed XML + sitemap valid
6. Lighthouse: Performance > 90, Accessibility > 95, SEO > 95, Best Practices > 95
7. Mobile viewport (375px) has no horizontal scroll
8. No hydration warnings in browser console

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.6
- Executor 01, 02, 05, 08, 09 (config / list / feed / docs): Haiku 4.5
- Executor 03, 04, 06, 07 (design-heavy pages + OG images): Sonnet 4.6
- Evaluator: Sonnet 4.6 fresh context

---

## Forbidden

- Adding a CMS (Sanity, Contentful, etc.) — content is MDX in repo, committed via git
- Carousels, animated hero illustrations, gradient blobs, glassmorphism, testimonial cards
- Dynamic loaders / skeleton states on static content
- Moving journal article files from MDX to DB
- Linking to the authenticated app from the landing page with more than one CTA (one link to /signin is enough; don't plaster "Sign up" everywhere)
- Tracking scripts (Google Analytics, Mixpanel, etc.) — Phase 2+ if needed, with cookie consent

---

## Notes for Yagi

- **Write article #1 during subtask 01:** The seed article doesn't need to be a polished launch post. Something like "Why we rebuilt YAGI Studio as a private portal" with 3–4 paragraphs. Replace with real content before public launch.
- **Domain setup:** Phase 1.6 assumes `yagiworkshop.xyz` points to Vercel with the landing at `/`. If the domain still points elsewhere, the work still ships but the OG image URLs will need updating on cutover.
- **Pretendard + Fraunces .woff2 files:** Commit these to `public/fonts/`. Subset to Korean + Latin basic to keep file size down (~100-150KB combined).
- **Case studies:** Start writing case study drafts now so that by Phase 2 there's real content in "Selected work" instead of placeholders. Format: 1 per major project, 500-1000 words, with hero image + 2-3 in-article figures.
