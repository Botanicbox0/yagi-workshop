# PRINCIPLES.md amend staging

Target: .yagi-autobuild/design-system/PRINCIPLES.md
Apply at Phase 2.4 G1.

## [§3 NEW] Aesthetic direction (entire section replace)

## 3. Aesthetic direction

**One direction, chosen:** *editorial minimal with modern grotesk typography on a light canvas.*

References (see REFERENCES.md for full list):
- **Webflow product** (designer.webflow.com) for editorial product UI on light surfaces.
- **Webflow brand** (webflow.com landing) for marketing surface calibration only — never imported into product surfaces (see ANTI_PATTERNS.md §3.2).
- Linear (light mode) for density and state clarity.
- Stripe dashboard for data-heavy editorial layouts.
- Height.app for keyboard-driven pace.
- Read.cv for typographic restraint on a white surface.

**What this looks like, concretely:**
- Background: pure white #FFFFFF for primary surfaces, #FAFAFA–#F5F5F5 for recessed panels. Never pure gray backgrounds with white cards — invert that.
- Text: near-black #080808 for body and headings (Webflow-aligned), graded neutral for metadata.
- **Accent: Webflow blue, dual-token system** — #146EF5 (primary, brand alignment) and #4353FF (softer variant, secondary actions, focus rings on dense surfaces). Used for:
  - Active navigation state
  - Focus rings on form inputs
  - Link color
  - **Never for primary action buttons** — those remain solid black.
- Primary action: solid black on white. Or white on solid black. No gradient buttons, ever.
- Borders: #EAEAEA hairlines (Webflow Gray 100-200 range). Never double borders. Never shadows to simulate elevation.
- Gray scale: 9-step neutral system aligned to Webflow's product gray ramp:
  - gray-100 (#F0F0F0) lightest panels
  - gray-200 (#D8D8D8) borders, dividers
  - gray-300 (#ABABAB) muted UI
  - gray-400 (#898989) hint text
  - gray-500 (#757575) secondary text
  - gray-600 (#5A5A5A) body emphasis
  - gray-700 (#363636) headings on light
  - gray-800 (#222222) high-contrast headings
  - gray-900 (#171717) near-black for body
- Radius: 6px for inputs/buttons, 8px for cards/panels, 0 for table rows. Consistent, not playful.
- Shadow: none by default. One permitted elevation (0 1px 2px rgba(0,0,0,0.04)) for floating surfaces (popover, dropdown, toast). Nothing else.

**Display font (per ADR-007):**
WF Visual Sans (variable font, weights 100-900) is used for display roles only. See TYPOGRAPHY_SPEC.md §3.1 and ADR-007 for full scope. Pretendard Variable remains the sole font for body/label/caption/code and all Korean text.

**Light theme only (per ADR-007 confirms ADR-002 stance):**
YAGI Workshop ships light-only. No dark mode. Any future dark mode introduction requires a new ADR with explicit user research justification.

**What this does NOT look like:**
- No glassmorphism. No backdrop-blur. No gradients on text or buttons.
- No playful illustrations, mascots, emoji-as-icons, rounded-cartoon aesthetics.
- No stock photography. No gradient hero backgrounds. No decorative SVG blobs.
- No "colorful tag salad" — tags are neutral with one semantic color layered only when meaning is conveyed (error/success/warning).
- No Material Design shadows. No iOS-translucent chrome. No Windows 11 mica.
- No Webflow brand mode patterns leaking into product (3D illustrations, 8x display, animated heroes) — see ANTI_PATTERNS.md §3.2.

## [§6 amend] Typography as structure (first bullet replace)

OLD:
- **Two families maximum** across the entire product. Currently: Pretendard Variable (primary, both ko and en) + a single modern grotesk for large display moments (optional, decision in TYPOGRAPHY_SPEC.md).

NEW:
- **Two families, role-separated** across the entire product (per ADR-007):
  - **Pretendard Variable** for body, label, caption, code, and ALL Korean text.
  - **WF Visual Sans** for display roles, marketing display headlines, and English section titles where geometric character is desired.
  - Korean display surfaces fall back to Pretendard at the same role — this is intentional, not a bug. WF Visual Sans has no Hangul glyphs.
  - Full role table: TYPOGRAPHY_SPEC.md §15.
