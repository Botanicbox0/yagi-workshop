# ADR-007 staging — append to docs/design/DECISIONS.md

## Index 행 (DECISIONS.md §Index 표 마지막에 추가)

| ADR-007 | WF Visual Sans display font (ADR-002 partial supersede) | Accepted  | 2026-04-23 |

## 본문 (DECISIONS.md 끝에 append)

---

## ADR-007: WF Visual Sans as display font (ADR-002 partial supersede)
Date: 2026-04-23
Status: Accepted
Supersedes: ADR-002 (partial — Pretendard remains sole font for body/label/caption/code; WF Visual Sans added for display role only)

### Context
ADR-002 established Pretendard Variable as the sole font, with rationale that Pretendard already embeds Inter as Latin subset. This held for product UI but produced two limitations:

1. Insufficient brand differentiation on marketing/display surfaces. Pretendard is excellent for body and product UI; for landing page hero, marketing display, and editorial moments it lacks the geometric character that distinguishes a brand voice.
2. Webflow-direction reference impossible to honor. PRINCIPLES.md §3 and REFERENCES.md established Webflow as primary aesthetic calibration target. Webflow's design language is anchored in WF Visual Sans (proprietary geometric grotesk descended from Avant Garde / Futura cues). Pretendard alone cannot communicate the Webflow editorial register that we explicitly chose to follow.

In April 2026, yagi obtained commercial licensing for WF Visual Sans through the Webflow Team account agreement (which includes brand asset usage rights). This unlocks the option ADR-002 had to defer.

### Decision
WF Visual Sans is added as the display-role font. Pretendard Variable remains the sole font for all other roles.

WF Visual Sans is used for:
- All display-* typography roles (display-lg, -md, -sm)
- Landing page and marketing surface section titles
- label-lg (English context only — KR remains Pretendard)
- English section titles where geometric character is desired

Pretendard Variable is used for:
- All body, label, caption, code roles
- All Korean text regardless of role (no exceptions)
- All product UI surfaces unless explicitly overridden by display role

Font loading: WF Visual Sans is served via next/font/local from public/fonts/WFVisualSansVF.woff2 (variable font, weights 100-900). Pretendard remains via existing strategy.

CSS variable exposure:
- --font-display → WF Visual Sans
- --font-sans → Pretendard

### Licensing basis
"yagi의 Webflow Team 계정 포함 계약에 근거" (yagi's commercial license through Webflow Team account agreement, April 2026).

TODO (follow-up phase): Strengthen evidence chain. Capture email correspondence date, responder name/team, explicit scope (production use, redistribution rights, geographic scope), email/PDF attached to internal compliance folder. Does not block production use; license exists. Blocks only future IP audit posture.

### Consequences
- Positive: Webflow editorial register achievable without aesthetic compromise. Marketing surfaces gain distinct brand voice. ADR-002's product-UI Pretendard discipline preserved 100% — body/label/caption never touch WF Visual Sans.
- Positive: Page weight bounded — variable font 367KB woff2, single file, font-display: swap. LCP impact expected <50ms on 4G.
- Negative: Two-font system increases cognitive overhead. Mitigated by TYPOGRAPHY_SPEC.md §15 (new) Font role table.
- Negative: KR display moments cannot use WF Visual Sans (no Hangul glyphs). KR display falls back to Pretendard at the same role. Intentional, not a bug.
- Negative: License evidence chain currently informal. IP audit posture has minor exposure until evidence boost.

### Alternatives considered
- Geist (Vercel) — strong product UI credentials, SIL OFL free. Rejected: doesn't carry Webflow's specific brand register.
- Urbanist — community consensus as closest WF Visual Sans equivalent. Rejected: actual font now available.
- Manrope — too similar to Pretendard's Latin (Inter-derived). Rejected.
- Space Grotesk — too character-heavy for editorial restrained direction. Rejected.
- Status quo (Pretendard only) — preserves ADR-002 cleanly but forfeits Webflow alignment. Rejected.
- WF Visual Sans Text variant — second family for body. Deferred: Pretendard already excellent for body. Reconsider only if marketing surface body copy requires it.

### Followups
- Phase 2.4 G1: globals.css + fonts.ts + tailwind.config.ts to consume new font
- Phase 2.4 G1: TYPOGRAPHY_SPEC.md §3.1, §3.2, §5.1, §10, §15 amend
- Phase 2.4 G1: PRINCIPLES.md §3, §6 amend
- Phase 2.4 G1: REFERENCES.md amend (Webflow product/brand split)
- Next phase: License evidence chain boost
- Phase 3.0+: Decide on WF Visual Sans Text variant
