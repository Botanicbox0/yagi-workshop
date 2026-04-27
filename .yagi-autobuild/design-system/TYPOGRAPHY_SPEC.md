# TYPOGRAPHY_SPEC.md
Version: 1.0
Owner: Design System
Platform: Webflow (primary), portable to Next.js
Scope: Product UI / Marketing UI / CMS-driven interfaces
Locales: Korean (ko), English (en)
Aesthetic direction: White editorial — see `PRINCIPLES.md`

---

## 1. Purpose

This document defines the typography system: how text is rendered, scaled, paired, and named across every YAGI Workshop interface.

It is not a font catalog or a list of pretty headlines.
It is a contract that determines:

- which font is used and why
- which sizes exist and which do not
- which roles text can play
- how Korean and English coexist
- how tokens are named so editors and developers cannot drift
- how the system behaves in Webflow

This system is product-first. We are designing **product UI**, not a marketing landing page. That single constraint informs every decision below.

---

## 2. Core principles

### 2.1 Two-font system (v0.2.0)
Pretendard Variable is the body/UI typeface; SUIT Variable is the editorial-headline typeface. Both are Korean-first variable fonts that pair cleanly across KR + EN.

- **Pretendard Variable** — body, labels, captions, UI chrome. Already incorporates Inter as its Roman subset, so Korean and English share a single, optically aligned font for body. Loaded via the existing CDN link tag (Phase 1.x).
- **SUIT Variable** — editorial headlines (hero h1, in-page section h2). Self-hosted at `public/fonts/SUIT-Variable.woff2`, wired via `next/font/local` with the CSS variable `--font-suit`. Tailwind class: `font-suit` (defined in `tailwind.config.ts` as a separate family alongside `sans` and `display`). License: `public/fonts/SUIT-LICENSE.txt` (SIL Open Font License from sun-typeface/SUIT).

The legacy `font-display` family points at Fraunces and is **landing/marketing-only** — it must not appear in `/app/*` product surfaces. Pairing a separate Latin font with a Korean font in body text almost always produces baseline drift and weight mismatch — we avoid it; both Pretendard and SUIT include Roman + Hangul on optically aligned baselines, so the pairing is safe.

### 2.1.x Legacy: One font, two languages (pre-v0.2.0)
Earlier drafts of this doc treated Pretendard as the only typeface across the product. Phase 2.9 G_B9_C added SUIT for editorial headlines on a deliberate, narrow surface; the body-font monoculture rule still holds.

### 2.2 Scale before style
A small, predictable type scale beats a large, expressive one in a product context. We start from 16px base and a 1.125 modular scale because product surfaces (tables, forms, dashboards, lists) reward density and rhythm over drama.

### 2.3 Semantic roles, not HTML tags
Type tokens map to roles (Display, Title, Heading, Body, Label, Caption, Code), not to `<h1>`–`<h6>`. HTML tags carry semantics for accessibility; visual scale is a separate concern. A `<h2>` styled as Title-md is normal; a `<div>` styled as Heading-lg is also normal.

### 2.4 Line-height is grid-aligned
Every line-height value is a multiple of 4. This guarantees that any text block lands on the 4pt baseline grid that the spacing system uses. Vertical rhythm is not optional.

### 2.5 Tokens are immutable in instances
Editors cannot override font size, weight, line-height, or letter-spacing at the instance level in Webflow. They can change content; they cannot change typography. This is non-negotiable for system integrity.

### 2.6 Korean expansion is the default assumption
We assume Korean labels take more horizontal space than equivalent English. We never tightly lock widths against the English version.

---

## 3. Foundations

### 3.1 Font family

```
Body / UI    "Pretendard Variable", Pretendard, -apple-system,
             BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue",
             "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR",
             "Malgun Gothic", sans-serif

Editorial    var(--font-suit), "SUIT Variable", "Pretendard Variable",
headline     ui-sans-serif, system-ui      [Tailwind class `font-suit`]

Landing      var(--font-fraunces), "Pretendard Variable", ui-serif, Georgia
display      [Tailwind class `font-display` — landing/marketing only]

Mono         "JetBrains Mono", "SF Mono", Menlo, Consolas,
             "Liberation Mono", monospace
```

All three fonts load as single variable font files. We never load static weights individually — all weight variations come from a single asset varying the `wght` axis.

**Loading strategy:**
- Pretendard Variable: CDN link tag in `[locale]/layout.tsx` head.
- SUIT Variable: self-hosted at `public/fonts/SUIT-Variable.woff2`, loaded via `next/font/local` (`src/app/fonts.ts`). Variable: `--font-suit`. License at `public/fonts/SUIT-LICENSE.txt`.
- Fraunces: Google Fonts via `next/font/google` with `--font-fraunces`. **Landing-only** — Builders must not apply `font-display` inside `/app/*` surfaces.

**Decision rule for headline type:**
- In-product editorial headlines (`/app/projects` hero h1, in-page h2) → `font-suit`.
- Body text everywhere → default Pretendard (no class needed).
- Landing / marketing (`/[locale]/page.tsx`, `src/components/home/*`, `src/components/marketing/*`) → `font-display` (Fraunces) for English display moments; SUIT not used there.

### 3.2 Editorial-headline scale (SUIT Variable, v0.2.0)

Hero h1 (Editorial Hub frame, `UI_FRAMES.md §Frame 6`):

```
font-suit text-4xl md:text-5xl lg:text-[56px] leading-[1.1] tracking-[-0.02em] font-bold
```

Mobile 36px → tablet 48px → desktop 56px. Tracking pulled tight (-0.02em) because SUIT's Korean glyphs read slightly looser than Pretendard at large sizes. Bold (700) is the operating weight.

In-page section h2 (e.g., a major editorial divider):

```
font-suit text-2xl lg:text-[28px] font-bold tracking-tight
```

Step number (`01`, `02` in workflow strip):

```
font-suit text-sm font-bold tabular-nums tracking-tight
```

**Editorial eyebrow pattern (canonical across the system):**

```
text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground
```

11px uppercase letter-spaced label. Used for both content section markers ("PROJECT", "BRAND CAMPAIGN", "VIDEO PRODUCTION") and structural section starts ("진행 과정"). This pattern lives operationally in `PRINCIPLES.md §4.4` — duplicated here only because typography spec is the natural place to look for the exact CSS values.

### 3.3 Why no editorial serif
Webflow's marketing site uses serif accents (a recent shift in 2025). For YAGI Workshop **product UI** we explicitly do not. Reasons:

- Serifs add cognitive load in dense product surfaces (tables, forms, settings).
- Pretendard already carries enough editorial character at heavier weights.
- Mixing serif + Korean sans creates baseline misalignment that no amount of tuning fully solves.

If marketing surfaces later require a serif accent (campaign pages, OG images), it is treated as a **brand asset**, not a system token.

### 3.4 Mono usage
Mono is used only for:

- code blocks
- API identifiers (request IDs, hashes, file names with extensions)
- numeric tabular data where alignment matters more than reading flow

Mono is never used for body text, labels, or headings.

---

## 4. Type scale

### 4.1 Scale system
- Base: **16px**
- Ratio: **1.125** (Major Second)
- Snapping: every value rounded to the nearest **4px multiple** for grid alignment

This produces the following raw scale (before snapping):
11.4 / 12.8 / 14.4 / 16 / 18 / 20.3 / 22.8 / 25.6 / 28.8 / 32.4 / 36.5 / 41 / 46.1

Snapped to system values:
**12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 40 / 48**

### 4.2 The complete scale

| Token | Size | Line-height | Role(s) it serves |
|---|---|---|---|
| `text-2xs` | 12px | 16px | Caption, Code-sm |
| `text-xs` | 14px | 20px | Label, Body-sm, Caption-lg |
| `text-sm` | 16px | 24px | Body (default), Heading-sm |
| `text-md` | 18px | 28px | Body-lg, Heading-md |
| `text-lg` | 20px | 28px | Heading-md large, Title-sm |
| `text-xl` | 24px | 32px | Title-md |
| `text-2xl` | 28px | 36px | Title-lg |
| `text-3xl` | 32px | 40px | Display-sm |
| `text-4xl` | 40px | 48px | Display-md |
| `text-5xl` | 48px | 56px | Display-lg (rare in product UI) |

We deliberately stop at 48px. Anything larger belongs to marketing surfaces, not product UI.

---

## 5. Semantic roles

Each role maps to specific tokens. Designers and developers reference roles by name, never raw sizes.

### 5.1 Display
**Purpose:** Page-level statements. Used sparingly — typically a dashboard welcome state, an empty state of significance, or a milestone screen.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `display-lg` | 48 | 600 | 56 | -0.02em |
| `display-md` | 40 | 600 | 48 | -0.02em |
| `display-sm` | 32 | 600 | 40 | -0.015em |

Rules:
- Maximum one Display per screen.
- Never wrapped in narrow containers.
- Never combined with another Display.

### 5.2 Title
**Purpose:** Section identity within a screen. The most common heading you will reach for.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `title-lg` | 28 | 600 | 36 | -0.015em |
| `title-md` | 24 | 600 | 32 | -0.01em |
| `title-sm` | 20 | 600 | 28 | -0.005em |

Rules:
- A page typically has one `title-lg` (page title), multiple `title-md`/`title-sm` for sections.
- Pair with Body or Body-sm for descriptions.

### 5.3 Heading
**Purpose:** Group labels inside cards, panels, modals, and table sections. The "smaller-than-section" tier.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `heading-md` | 18 | 600 | 28 | 0 |
| `heading-sm` | 16 | 600 | 24 | 0 |

Rules:
- Heading is for grouping; if you find yourself using a 4th level inside a card, restructure instead.

### 5.4 Body
**Purpose:** All running text — descriptions, paragraphs, dialog body, help text.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `body-lg` | 18 | 400 | 28 | 0 |
| `body` | 16 | 400 | 24 | 0 |
| `body-sm` | 14 | 400 | 20 | 0 |

Variants:
- `body-emphasis` = same size, weight 600 — for inline emphasis only.
- `body-strong` = same size, weight 700 — reserved; almost never used.

Rules:
- Default to `body` (16px). Drop to `body-sm` only in dense surfaces (tables, compact panels, chips).
- Never style body text with weight 500 — it sits between regular and semibold ambiguously.

### 5.5 Label
**Purpose:** Form labels, field titles, button text, tab labels, breadcrumbs, badges, table column headers.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `label-lg` | 16 | 500 | 24 | 0 |
| `label` | 14 | 500 | 20 | 0 |
| `label-sm` | 12 | 500 | 16 | 0.01em |

Rules:
- Label weight is **500**, not 600. Labels are not headings.
- All-caps labels (when used at all) only at `label-sm` with `letter-spacing: 0.06em`. Avoid all-caps in Korean.

### 5.6 Caption
**Purpose:** Helper text, metadata, timestamps, secondary descriptions, micro-copy.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `caption` | 12 | 400 | 16 | 0 |

Rules:
- Captions are always paired with a primary element they describe.
- Caption color is muted (semantic token: `text-muted`) — see `PRINCIPLES.md`.

### 5.7 Code
**Purpose:** Inline code, code blocks, monospace identifiers.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| `code` | 14 | 400 | 20 | 0 |
| `code-sm` | 12 | 400 | 16 | 0 |

Rules:
- Inline code uses `code` size matched to surrounding body text (not always 14 — use the font-size of context if larger).
- Code blocks use `code` with a tinted background and 16px padding.

---

## 6. Weight

Available weights (Pretendard Variable axis: 100–900):

| Weight | Use |
|---|---|
| 400 | Body, Caption, Code |
| 500 | Label only |
| 600 | Display, Title, Heading, Body-emphasis |
| 700 | Reserved (Body-strong, brand moments only) |

Forbidden:
- 100, 200, 300 — too thin for KR readability at product sizes
- 800, 900 — too heavy for product UI; reads as marketing

We do not use weight 500 for emphasis. Emphasis goes from 400 → 600 in one step. The 500 step exists exclusively for labels because labels need to feel structural without competing with headings.

---

## 7. Line-height

### 7.1 Why all line-heights are pixel values, not unitless
Pretendard's optical metrics differ from pure Latin fonts. Unitless line-height (e.g. `1.5`) compounds inconsistently when descendants override font-size. We use absolute pixel values per role so the 4pt grid is preserved everywhere.

### 7.2 Why our line-heights are tighter than CJK convention
Traditional CJK typesetting recommends ~1.7 leading. Pretendard is optimized for tighter setting because its Korean glyphs have narrower bounding boxes than Noto Sans KR. Our values land in the 1.4–1.55 range, calibrated per role.

| Role | Effective ratio | Rationale |
|---|---|---|
| Display | 1.17–1.25 | Tight for impact |
| Title | 1.27–1.33 | Balanced for headings |
| Heading | 1.50–1.56 | Sits comfortably above body |
| Body | 1.50 | Optimal for KR/EN running text |
| Label | 1.33–1.43 | Tight, structural |
| Caption | 1.33 | Compact for metadata |

### 7.3 Vertical alignment with components
Because all line-heights are 4pt multiples, text blocks align to component padding without the "phantom space" problem that plagues Latin-only systems. For example: a `body` text node (24px line-height) inside a card with 16px padding produces a clean 16/24/16 vertical stack.

---

## 8. Letter-spacing (tracking)

| Token | Value | Use |
|---|---|---|
| `tracking-tight-2` | -0.02em | Display |
| `tracking-tight-1` | -0.01em | Title |
| `tracking-normal` | 0 | Heading, Body, Label, Caption, Code |
| `tracking-wide-1` | 0.01em | `label-sm` (default) |
| `tracking-wide-2` | 0.06em | All-caps `label-sm` only |

Rules:
- Negative tracking (tightening) only for sizes ≥ 24px.
- Positive tracking only for small sizes ≤ 12px or all-caps.
- Korean text: avoid `letter-spacing` outside `0` for body/label. Korean glyph spacing is part of the typeface's design — adding tracking distorts it.

---

## 9. Korean / English dual-locale rules

### 9.1 Single-font advantage
Because Pretendard already includes Inter for Roman glyphs, mixed text like `Phase 2.0 완료` renders with consistent baseline and stroke weight — no `:lang()` switching needed for *most* cases.

### 9.2 When to use `:lang()` overrides
Only in two specific cases:

```css
/* Case 1: Korean-only paragraph that benefits from looser leading */
:lang(ko) .body-long {
  line-height: 28px; /* was 24 */
}

/* Case 2: English-only label where weight reads heavier */
:lang(en) .label {
  font-weight: 500; /* keep */
}
:lang(ko) .label {
  font-weight: 500; /* keep — Pretendard handles weight equivalence */
}
```

Do not use `:lang()` for cosmetic font-family swaps. Pretendard handles both.

### 9.3 Width planning
Korean text averages ~10–25% wider than equivalent English at the same font size. Therefore:

- Buttons, tabs, badges: never set fixed widths in pixel terms based on English copy.
- Use `min-width` for tap targets, `max-width` for line length, never `width` alone.
- Tables: column widths are designed against the *Korean* version of column headers and likely cell content, not the English version.

### 9.4 Line length
Optimal characters-per-line:

| Locale | Body line length |
|---|---|
| English (en) | 60–80 ch |
| Korean (ko) | 30–45 ch (each Korean character carries more information) |

In components that hold long-form text (article body, log detail, notification body), we set `max-width` based on Korean reading, not English.

### 9.5 Mixed text in headings
Headings often contain both KR and EN (`Phase 2.0 출시`, `Wan2.2 모델 추가`). Pretendard handles this natively. Do not insert manual spacing or `<wbr>` between scripts unless line-break behavior is broken.

### 9.6 Numerals
Use Pretendard's default proportional numerals for body and headings. For tables and dashboards where numerical comparison matters, switch to tabular figures:

```css
.numeric, .data-cell.is-numeric, .stat {
  font-variant-numeric: tabular-nums;
}
```

This is mandatory for: data tables, dashboards, currency displays, time displays, and any column where vertical digit alignment matters.

---

## 10. Token naming convention

Tokens follow a strict hierarchical pattern:

```
typography-{role}-{size}-{attribute}
```

Examples:
- `typography-body-md-size`
- `typography-body-md-line-height`
- `typography-body-md-weight`
- `typography-body-md-tracking`
- `typography-title-lg-size`
- `typography-label-sm-tracking`

Rationale:
- `{role}` is semantic — `display`, `title`, `heading`, `body`, `label`, `caption`, `code`
- `{size}` uses a controlled vocabulary — `lg`, `md`, `sm` (and `xl`, `2xl` only for Display when needed)
- `{attribute}` is one of — `size`, `line-height`, `weight`, `tracking`

Forbidden naming patterns:
- `text-32` — references raw value, not role
- `heading-1` — implies HTML semantics
- `font-pretty-big` — not semantic, not scalable
- `marketing-hero-headline` — context-bound, will be misused

---

## 11. Webflow implementation

### 11.1 Variables
All typography tokens live in a single Webflow Variables collection: **Typography**.

Subgroups inside the collection:
- `display/`
- `title/`
- `heading/`
- `body/`
- `label/`
- `caption/`
- `code/`
- `tracking/` (shared)

Each role has 4 variables (`-size`, `-line-height`, `-weight`, `-tracking`).

### 11.2 Tag styles vs class styles
Per Webflow design system convention:

- **Tag styles** (All H1, All H2, All Body, All Paragraph) carry the *most common* default for that tag — typically Title-md for `<h2>`, Body for `<p>`.
- **Class styles** (`.title-lg`, `.body-sm`, `.label`, etc.) carry role-specific styling.
- **Combo classes** modify state (`.body.is-muted`, `.label.is-uppercase`) — never typography itself.

### 11.3 Variable modes (responsive)
Use Webflow Variable Modes to define responsive shifts:

| Mode | Shift |
|---|---|
| Desktop (default) | Scale as defined |
| Tablet | Display drops one step (display-lg → display-md) |
| Mobile | Display drops two steps; Title drops one step; Body unchanged |

Body sizes never shrink on mobile. We do not punish small-screen readers.

### 11.4 Property exposure on components
For text-bearing components, Webflow component properties expose:

- `text` (string content)
- *nothing else typography-related*

Editors cannot change size, weight, color, or line-height of text inside components. They change content; the system controls appearance.

---

## 12. Responsive scaling

### 12.1 Why we don't use `clamp()` for everything
`clamp()` for fluid type is fashionable but breaks the 4pt grid at intermediate viewport widths. We use stepped scaling at breakpoints instead:

```
Breakpoints (Webflow defaults):
- Desktop: ≥ 992px
- Tablet:  768–991px
- Mobile landscape: 480–767px
- Mobile portrait:  ≤ 479px
```

Display roles step down once between Desktop → Tablet, and once more between Tablet → Mobile. Title roles step down once Desktop → Mobile. Heading/Body/Label/Caption/Code never change.

### 12.2 When `clamp()` is acceptable
Only on marketing surfaces (hero sections, campaign pages) where grid precision yields to expressive scale. Document with a comment: `/* clamp: marketing surface, intentional grid drift */`.

---

## 13. Color and emphasis

Typography color tokens are defined in `PRINCIPLES.md` (color section). This document references them by semantic name only:

- `text-primary` — default for Body, Title, Heading
- `text-secondary` — default for Caption, helper text
- `text-muted` — disabled or deeply secondary
- `text-inverse` — on dark backgrounds (badges, tooltips)
- `text-action` — links, interactive labels
- `text-success` / `text-warning` / `text-error` — semantic states

Emphasis hierarchy is established **first by weight, then by color, never by size jump**. Going from 400 to 600 is a stronger signal than going from 16 to 18.

---

## 14. Accessibility

### 14.1 Minimum sizes
- Body text: never below 14px on any breakpoint.
- Caption: 12px is the floor; if a caption needs to be smaller, the design is wrong.
- Label: 12px floor for visible labels; never below.

### 14.2 Contrast
All typography colors meet WCAG AA at the size they are used (4.5:1 for normal text, 3:1 for large text ≥ 18px or ≥ 14px bold). See `PRINCIPLES.md` for color contrast verification.

### 14.3 Text alignment
- Default: left-aligned. Always.
- Centered: only for Display-tier headlines or single-line empty states.
- Right-aligned: only for numeric columns and table cells with `is-numeric`.
- Justified: never. Justified text breaks Korean spacing.

### 14.4 Line length
Enforce `max-width` for any text block holding more than 2 lines. Reference §9.4 for locale-specific values.

### 14.5 Focus on text-only links
Underline by default. Underline-on-hover only is rejected.

---

## 15. Anti-patterns

Things we explicitly do not do:

- **All-caps Korean text** — Korean has no case; "all-caps" applied via `text-transform: uppercase` produces no visual change but breaks screen readers.
- **Italic Korean text** — Pretendard does not ship a true italic; synthetic italics distort glyphs.
- **Two-font sandwiches** for KR+EN — we have one font for a reason.
- **Letter-spacing on Korean body text** — distorts glyph spacing designed by the typeface.
- **Display sizes inside cards** — Display roles are page-level, never card-level.
- **Weight 500 for body emphasis** — ambiguous between regular and semibold.
- **Mixing tabular and proportional numerals in the same table column** — pick one per column.
- **Synthetic font weights** (`font-weight: 800` when only 700 is loaded) — produces blurry rendering.
- **Custom line-height per text node in Webflow** — must come from the role token.
- **Decorative serifs in product UI** — see §3.2.

---

## 16. QA checklist

A typography implementation is ready only if:

- All text uses a role token, not a raw size.
- All line-heights are multiples of 4.
- No font-family override outside the system stack.
- Korean and English render with consistent baseline (visual check at 16px and 24px).
- Numeric columns use `font-variant-numeric: tabular-nums`.
- No text smaller than 12px anywhere.
- No all-caps applied to Korean text.
- No `letter-spacing` on Korean body or label text.
- Mobile body sizes are not smaller than desktop body sizes.
- All Display/Title roles step down correctly at responsive breakpoints.
- Inline code matches surrounding body size.
- Color references semantic tokens, not raw values.
- Tabular contexts use mono or tabular numerals — never proportional.
- No editor-overridable typography on instance level.

---

## 17. Reference cross-links

- Color system, semantic color tokens → `PRINCIPLES.md`
- Component-specific typography use → `COMPONENT_CONTRACTS.md`
- Visual review of typography in context → `DESIGN_REVIEW.md`
- Frame-level composition rules → `UI_FRAMES.md`

---

## 18. Open questions (deferred)

These are intentionally not decided in v1.0; revisit when the relevant surfaces ship:

- **Marketing-surface serif accent**: if/when a serif is introduced for campaign pages, what governs it? (Defer to marketing brief.)
- **OG image typography**: server-rendered OG images cannot use Pretendard Variable easily — what fallback?
- **Email typography**: transactional emails use system fonts; should we publish a separate email type token set?
- **Print typography (PDF exports)**: future challenge submission certificates, etc. — what scale?

These are tracked separately and do not block product UI work.
