# TYPOGRAPHY_SPEC.md amend staging

Target: .yagi-autobuild/design-system/TYPOGRAPHY_SPEC.md
Apply at Phase 2.4 G1.

## [§3.1 NEW] Font family (entire section replace)

### 3.1 Font family

```
Display:   "WF Visual Sans", var(--font-display),
           Pretendard Variable, ui-sans-serif, system-ui, sans-serif
           (ADR-007 — display role only, EN content; KR falls back to Pretendard)

Primary:   "Pretendard Variable", Pretendard, -apple-system,
           BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue",
           "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR",
           "Malgun Gothic", sans-serif
           (Body, label, caption, code, all Korean text)

Mono:      "JetBrains Mono", "SF Mono", Menlo, Consolas,
           "Liberation Mono", monospace
```

Pretendard Variable is loaded as a single variable font file. WF Visual Sans is loaded via next/font/local from public/fonts/WFVisualSansVF.woff2 (variable font, weights 100-900). Both fonts use font-display: swap.

CSS variable exposure:
- --font-display → WF Visual Sans
- --font-sans → Pretendard
- --font-mono → JetBrains Mono fallback chain

Per ADR-007 role separation rule: never use WF Visual Sans for body, label, caption, or any Korean text. See §15 for the complete font-to-role mapping.

## [§3.2 RENAMED + REWRITTEN] Why dual sans (Pretendard + WF Visual Sans)

Replace existing §3.2 entirely. New title: "Why dual sans (Pretendard + WF Visual Sans)"

### 3.2 Why dual sans (Pretendard + WF Visual Sans)

YAGI Workshop runs on two sans-serif fonts (per ADR-007), not one. Each carries a distinct role.

**Pretendard for product UI and all Korean.** Pretendard is humanist neo-grotesque, optimized for screen readability with strong Korean glyph design (based on Bongothic / Noto Sans KR foundation). It handles dense surfaces (tables, forms, dashboards, settings) with low cognitive load and renders Korean and Latin in one consistent typeface.

**WF Visual Sans for display and brand voice.** WF Visual Sans is geometric grotesk descended from Avant Garde / Futura cues. It carries the editorial register that Pretendard cannot — large display moments, marketing surface headlines, brand expression. It has no Hangul glyphs by design; this is acceptable because Korean display surfaces fall back to Pretendard at the same role, preserving readability.

**Why not editorial serif.** For YAGI Workshop product UI we explicitly do not use serif. Reasons:
- Serifs add cognitive load in dense product surfaces.
- Pretendard already carries enough editorial character at heavier weights for product surfaces.
- WF Visual Sans now provides editorial display character without serif baseline mismatch.
- Mixing serif + Korean sans creates baseline misalignment that no amount of tuning fully solves.

If marketing surfaces later require a serif accent (campaign pages, OG images), it is treated as a brand asset, not a system token, and requires a follow-up ADR.

## [§5.1 amend] Display role table (Family column 추가)

Replace the existing role table with:

| Role | Family | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| display-lg | WF Visual Sans (KR: Pretendard) | 48 | 600 | 56 | -0.02em |
| display-md | WF Visual Sans (KR: Pretendard) | 40 | 600 | 48 | -0.02em |
| display-sm | WF Visual Sans (KR: Pretendard) | 32 | 600 | 40 | -0.015em |

Add rules below:
- WF Visual Sans renders for English content only. Korean content automatically falls back to Pretendard via the font-family stack.
- For Display in Korean, line-height may need +4px adjustment via :lang(ko) .display-* override (Pretendard at 48px sets tighter than WF Visual Sans at 48px).

## [§10 additions] Token naming convention

Append to §10:

Font family tokens:
- typography-display-family → WF Visual Sans stack
- typography-sans-family → Pretendard stack
- typography-mono-family → JetBrains Mono stack

Per role family override:
- typography-display-lg-family (default: display)
- typography-title-lg-family (default: sans)
- typography-heading-md-family (default: sans)
- (other roles default to sans)

## [§15 NEW] Font role table — single source of truth

Insert new §15 after §14:

## 15. Font role table — single source of truth

| Role | Font | Why |
|---|---|---|
| display-lg | WF Visual Sans (EN) / Pretendard (KR) | Brand voice, marketing hero, page-level statement |
| display-md | WF Visual Sans (EN) / Pretendard (KR) | Section hero, milestone screen |
| display-sm | WF Visual Sans (EN) / Pretendard (KR) | Empty state significance |
| title-lg | Pretendard | Page title in product UI |
| title-md | Pretendard | Section title |
| title-sm | Pretendard | Sub-section title |
| heading-md | Pretendard | Group label inside cards |
| heading-sm | Pretendard | Group label inside panels |
| body-lg | Pretendard | Long-form paragraph |
| body | Pretendard | Default running text |
| body-sm | Pretendard | Dense surface body |
| body-emphasis | Pretendard (weight 600) | Inline emphasis |
| label-lg | WF Visual Sans (EN) / Pretendard (KR) | Marketing CTA label, section eyebrow |
| label | Pretendard | Form labels, button text, tab labels |
| label-sm | Pretendard | Badge, table column header |
| caption | Pretendard | Helper text, metadata, timestamps |
| code | JetBrains Mono fallback | Inline code, code blocks |
| code-sm | JetBrains Mono fallback | Small code identifiers |

**Decision rule (when in doubt):**
1. Is this Korean text? → Pretendard.
2. Is this body, label, or caption? → Pretendard.
3. Is this a display role or marketing headline? → WF Visual Sans (EN) / Pretendard (KR).
4. Is this an English section title where geometric character is desired? → WF Visual Sans.
5. Otherwise → Pretendard.

**Anti-patterns (rejected in Design Review):**
- WF Visual Sans for body or label-default
- WF Visual Sans for any Korean text
- Mixing WF Visual Sans and Pretendard within the same heading line
- WF Visual Sans for code, mono numerals, or table data
- Override font-family inline at the component instance level (use role tokens)
