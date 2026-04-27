---
name: yagi-design-system
description: >-
  YAGI Workshop design system v0.2.0 — the editorial integration discipline
  derived from Phase 2.9 (Projects hub redesign) and isomeet.com calibration.
  Auto-trigger this skill on ANY UI surface change inside YAGI Workshop:
  new components, page layouts, hero/CTA/section composition, typography
  decisions, motion choices, color/border/shadow choices, empty-state
  authoring. Load AFTER `yagi-nextjs-conventions` (which covers code-side
  conventions). This skill governs aesthetic + composition.
---

## 1. Load order and source of truth

Always load in this order:
1. `/CLAUDE.md` — project root.
2. `yagi-nextjs-conventions` — code conventions.
3. **This skill** — design system enforcement.

**Source of truth for aesthetic decisions** is the documentation under
`.yagi-autobuild/design-system/`:

- `PRINCIPLES.md` — aesthetic philosophy + 9 editorial integration patterns (§4)
- `ANTI_PATTERNS.md` — what is forbidden, including 5 composition anti-patterns (§10)
- `TYPOGRAPHY_SPEC.md` — Pretendard / SUIT two-font system, scales, eyebrow pattern
- `INTERACTION_SPEC.md` — motion tokens + layout-changing transitions (§10)
- `COMPONENT_CONTRACTS.md` — primitives + the 5 v0.2.0 editorial components (§5.11–§5.16)
- `UI_FRAMES.md` — six frames including Frame 6 Editorial Hub
- `REFERENCES.md` — six core calibration references including isomeet
- `CHANGELOG.md` — version history; consult `[0.2.0]` for the integration release

If this skill and the docs disagree, the docs win and this skill needs updating.

---

## 2. The 9 editorial integration patterns (PRINCIPLES.md §4)

Every Builder change to a UI surface must be defensible against these 9
patterns. They emerged from Phase 2.9 hotfix-2 (isomeet.com calibration)
and are now the canonical aesthetic discipline:

1. **Two-font system** — Pretendard for body/UI, SUIT for editorial headlines, Fraunces for landing-only display. Never mix.
2. **Achromatic only on product surfaces** — zero accent color in `/app/*`. Amber accent is scoped to landing/marketing surfaces.
3. **Hairline borders + soft layered shadows** — `border-border/40` or `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]`. Never a hard 1px black-ish border.
4. **Editorial labels (eyebrow pattern)** — `text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground` replaces section headlines. The page has one `<h1>`; everything else demotes.
5. **Asymmetric visual weight** — decision zone (informational, heavier) + emotional zone (photographic, lighter) on hubs. 50/50 splits read as SaaS, not editorial.
6. **Photography as content** — illustrations, icons, 3D renders, AI-generic gradients are forbidden in editorial contexts. Photography carries tonal information that copy cannot.
7. **Spring physics for layout transitions** — Framer Motion `<motion.div layout>` with `{stiffness:80, damping:22, mass:0.9}` (the `spring-natural` token). One per viewport max.
8. **Inverted CTA** — `bg-foreground text-background` pill with trailing `ArrowUpRight` icon. The hero CTA inverts the page; the CTA banner inverts the inversion.
9. **Seamless composition** — no `border-b` / `border-t` / `<hr>` between sections of the same surface. Vertical spacing carries section transitions.

---

## 3. The 5 composition anti-patterns (ANTI_PATTERNS.md §10)

If a Builder produces any of these, reject and revise:

- **§10.1 Visible internal seams** — `border-b` under page header, `border-t` between hero and workflow strip, any horizontal rule between sections of one composition.
- **§10.2 Heavy section headers** — `<h2 class="text-2xl">` instead of the eyebrow. The page has one h1; everything else is supportive.
- **§10.3 Equal-weight card grid for value props** — 3-up identical cards with icon+title+body. Reads as SaaS panel chrome. Use asymmetric weight + photography instead.
- **§10.4 Hard 1px black-ish borders on cards** — `border border-border` with default Tailwind border weight. Use the soft layered shadow token or `border-border/40` instead.
- **§10.5 Flat black CTA banner without depth** — solid `bg-zinc-950` slab with no shadow, no inner highlight. Reads as page footer chrome. Use depth treatment + larger padding + `rounded-3xl`.

---

## 4. Typography rules (TYPOGRAPHY_SPEC.md §3)

### 4.1 Three font families, by surface

| Family | Use | Tailwind class |
|---|---|---|
| Pretendard Variable | All body / UI text — both ko and en | (default `font-sans`) |
| SUIT Variable | Editorial headlines on hubs (Frame 6), section titles where editorial weight is needed | `font-suit` |
| Fraunces | Landing/marketing display only — italic emphasis | `font-display` (LANDING ROUTES ONLY) |

**Decision rule for headline type:**
- Inside `/app/*` editorial hub (Frame 6) → SUIT.
- Inside `/app/*` non-editorial surface → Pretendard bold (no SUIT).
- Inside `/` landing → Fraunces italic for emphasis; SUIT for display headers; Pretendard for body.

### 4.2 Hero h1 canonical class

```tsx
<h1 className="font-suit text-4xl md:text-5xl lg:text-[56px] leading-[1.1] tracking-[-0.02em] font-bold text-foreground whitespace-pre-line keep-all">
  {t("hero_title")}
</h1>
```

### 4.3 Eyebrow canonical class

```tsx
<p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
  {t("hero_meta_eyebrow")}
</p>
```

### 4.4 Korean rules
- All Korean copy uses `keep-all` for word-break.
- Headline line breaks via `whitespace-pre-line` on the element + `\n` in i18n string. Never `<br>`.
- Numbers use `tabular-nums` for step counters, KPIs, table cells.

---

## 5. Motion rules (INTERACTION_SPEC.md §10)

### 5.1 Layout-changing transitions

When a surface needs to swap between intrinsic layout dimensions (aspect-ratio change, e.g., 1:1 ↔ 5:2), use Framer Motion:

```tsx
"use client";
import { motion, AnimatePresence } from "framer-motion";

<motion.div
  layout
  transition={{ type: "spring", stiffness: 80, damping: 22, mass: 0.9 }}
  className="w-full"
  style={{ aspectRatio: isExpanded ? "5 / 2" : "1 / 1" }}
>
  <AnimatePresence mode="wait" initial={false}>
    <motion.img
      key={activeIndex}
      src={images[activeIndex]}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    />
  </AnimatePresence>
</motion.div>
```

Rules:
- Spring config is exactly `{stiffness: 80, damping: 22, mass: 0.9}`. Other values require an ADR.
- Image cross-fade uses `duration-normal` (200ms) + `ease-out`, not the spring.
- Hover-gated (`@media (hover: hover)`) — touch devices show resting state.
- One spring-driven layout transition per viewport.
- Reduced-motion path: collapses to instant state change.

### 5.2 When NOT to spring
- Standard component transitions (modals, dropdowns, hover lifts, focus rings) → use `duration-*` + `ease-*` from §3.1 / §3.2.
- The spring is for **layout**, not for **transform/opacity**.

### 5.3 Framer Motion → Client Component
Any component that uses Framer Motion must be marked `"use client"`. Keep the motion-bearing element a Client Component while the parent stays Server Component when possible.

---

## 6. Component contracts (v0.2.0 additions, COMPONENT_CONTRACTS.md §5.11–§5.16)

Five new contracts ship in v0.2.0. When building or modifying these, consult the doc:

- **§5.11 SidebarBrand** — workspace identity slot, no border-b separating from nav.
- **§5.12 InteractiveVisualStack** — Client Component, the canonical `spring-natural` instance. Photography only.
- **§5.13 ProjectsHubHero** — Server Component. Two-zone asymmetric. SUIT headline. Inverted CTA pill. `py-8 lg:py-12` (tightened).
- **§5.14 ProjectsHubWorkflowStrip** — Server Component. Soft layered shadow cards, eyebrow as section header.
- **§5.15 ProjectsHubCtaBanner** — Server Component. Inverted panel with depth, not a flat black slab.

When generalizing this composition to a different hub (e.g., a future Storyboards hub), rename the contracts (`StoryboardsHubHero`, etc.) but keep the structural rules identical.

---

## 7. Frame selection (UI_FRAMES.md)

Pick exactly one frame before designing any screen:

| Frame | When |
|---|---|
| Overview | summary of a scope |
| Browse | finding one item among many |
| Detail | deep view of one thing |
| Create / Edit | input + validate + submit |
| Workflow | multi-step ordered process |
| **Editorial Hub *(v0.2.0)*** | onboarding to a hub with brand voice (empty / pre-conversion) |

Editorial Hub is the canonical home for the 9 patterns. If a screen is the empty state of a major surface AND the surface deserves brand voice (not just utility copy), use Frame 6.

---

## 8. Calibration references (REFERENCES.md)

When building new editorial surfaces, calibrate against these (do not copy):

- **isomeet.com** — primary anchor for Frame 6. Asymmetric two-zone hero, photography-as-content, soft shadows on cards, inverted CTA banner with depth, seamless composition.
- **Linear** — Browse frames. State clarity, density without clutter.
- **Stripe Dashboard (light)** — Detail frames. Data-heavy editorial.
- **Webflow** — landing surfaces. Editorial typographic hierarchy.
- **Height** — projects + threads model.
- **Read.cv / Bento.me** — public showcase pages.

When in doubt about a hub's empty-state composition, the answer is "do what isomeet does" + apply the YAGI palette discipline.

---

## 9. Acceptance check before claiming a UI surface is done

Before reporting any UI work as complete, verify:

- [ ] Every user-facing string is in `messages/{ko,en}.json` — no hardcoded strings.
- [ ] One `<h1>` per page; every other section header is an eyebrow.
- [ ] No `border-b` / `border-t` / `<hr>` between sections of the same composition.
- [ ] Cards use soft layered shadow OR `border-border/40` — never default `border border-border`.
- [ ] CTA pills use inverted treatment (`bg-foreground text-background` + ArrowUpRight) where applicable.
- [ ] Korean copy uses `keep-all`; multi-line headlines use `whitespace-pre-line`.
- [ ] Achromatic on product surfaces — no amber accent inside `/app/*`.
- [ ] If layout-changing transition is present: spring config matches `spring-natural` exactly, hover-gated, reduced-motion path verified.
- [ ] Framer Motion components are `"use client"`.
- [ ] Photography-only in editorial contexts — no illustrations or icon-art.
- [ ] No equal-weight 3-up card grids for "value props".

If any of these fail, fix before reporting done.

---

## 10. Anti-patterns to reject in review

In addition to the 5 in ANTI_PATTERNS.md §10, also reject:

- **Mixing SUIT and Fraunces on the same screen** — pick one editorial type per surface.
- **Bento grid feature panels in product UI** — that's marketing language; product is editorial-restrained.
- **Status-driven page-chrome color** — status lives in the badge, not the page background.
- **Decorative motion on landings** — Phase 2.9+ decision: motion serves communication, never decoration.
- **Flashy hero illustrations** — photography or nothing.
- **Tabs that hide critical state** — if the user needs to know 3 things about an object, show all 3.
- **Zebra striping on tables** — use hairline separators between rows.

---

## 11. Self-improving footer

When yagi says: "update yagi-design-system skill — [content]", edit this file directly and report the change in the response. When the design-system docs under `.yagi-autobuild/design-system/` change in a way that affects enforcement, this skill must be re-synced in the same PR (per Phase 2.10 Q3=a).
