# REFERENCES.md amend staging

Target: .yagi-autobuild/design-system/REFERENCES.md
Apply at Phase 2.4 G1.

## [§1.2 SPLIT into §1.2 + §1.3]

DELETE existing §1.2 Webflow entry entirely.

INSERT two new entries:

### 2. Webflow product (designer.webflow.com) — *primary product UI reference*
**Why reference:** Editorial typographic hierarchy on a light surface. Generous whitespace inside dense product chrome. Section rhythm without relying on cards. Modern grotesk (WF Visual Sans, also adopted by YAGI per ADR-007) as identity carrier.

**Study for:**
- Product surfaces (dashboard, project detail, settings, account)
- Sidebar + main content + properties panel triple-pane patterns
- Section break patterns (hairline + label, never colored blocks)
- Button styling — solid black CTAs on white
- Form control density and grouping
- Light-surface focus and selection states

**Avoid copying:**
- The Webflow Designer's three-panel density when the surface is simpler — don't import complexity for its own sake.
- Webflow's specific blue accent saturation (we use #146EF5 + #4353FF dual; Webflow uses primary #146EF5 across all states).

**Cross-reference:** Webflow brand mode (entry below) is OFF-PALETTE for product surfaces. See ANTI_PATTERNS.md §3.2.

### 3. Webflow brand (webflow.com landing, brand.webflow.com) — *marketing surface only*
**Why reference:** Bold editorial display typography. WF Visual Sans at large scale. "Lead with blue, black, and white" brand discipline. Restrained illustration system (Standard / Elevated / Aspirational tiers).

**Study for:**
- Marketing surfaces only — landing page, campaign pages, OG images, public showcase covers
- Display typography treatment at h0 (128px) / h1 (85px) brand scale
- Brand-mode color usage ("punchy" palette: black + white + ONE color)
- Section rhythm with hero-band → editorial body → CTA layout

**Avoid copying:**
- Animated heroes, parallax — we don't do decorative motion.
- 3D illustrations, dimensional figures — Webflow's own brand identity, not ours.
- Bento grid feature sections for admin surfaces — marketing language, not working tool language.
- WF Visual Sans display sizes (≥48px) inside product UI — see ANTI_PATTERNS.md §3.1.

**Phase scope:** OFF-PALETTE until Phase 2.7+ when first true marketing surface is built. Until then, treat as inspiration only — do not import patterns into product surfaces.

**Why this split matters:** Webflow itself maintains brand vs product mode separation explicitly: "In brand our colors are bright and punchy. In product they're serious and restrained." (Webflow Design Guidelines, accessed 2026-04-23). Treating Webflow as one reference produces leakage of brand-mode patterns into product surfaces — the most common AI-built portal failure mode.

## Renumber subsequent entries
- 기존 §1.3 Stripe Dashboard → §1.4
- 기존 §1.4 Height → §1.5
- 기존 §1.5 Read.cv → §1.6

## Last updated bump
Last updated: 2026-04-23 (Webflow product/brand split per Phase 2.4 G1).
