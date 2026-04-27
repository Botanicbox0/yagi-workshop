// ============================================================================
// fonts.ts — Phase 2.4 PROPOSED amend
//
// Source:  .yagi-autobuild/phase-2-4/fonts-proposed.ts
// Target:  src/app/fonts.ts (merge wfVisualSans export at G1)
//
// Per ADR-007: WF Visual Sans for display only. Pretendard for everything else.
// ============================================================================

import localFont from 'next/font/local';

/**
 * WF Visual Sans — display font
 * License: yagi의 Webflow Team 계정 포함 계약에 근거 (ADR-007)
 * Source: public/fonts/WFVisualSansVF.woff2 (variable font, weights 100-900)
 *
 * Usage:
 *   <html className={wfVisualSans.variable}>
 *   then in CSS: font-family: var(--font-display)
 *   or in Tailwind: className="font-display"
 *
 * Display roles only (per TYPOGRAPHY_SPEC.md §15):
 *   - display-lg / display-md / display-sm
 *   - landing/marketing 표제어
 *   - label-lg (EN context)
 *   - EN section titles where geometric character is desired
 */
export const wfVisualSans = localFont({
  src: [
    {
      path: '../../public/fonts/WFVisualSansVF.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: false,
  fallback: [
    'Pretendard Variable',
    'ui-sans-serif',
    'system-ui',
    'sans-serif',
  ],
});

// At G1, MERGE wfVisualSans into existing src/app/fonts.ts.
// Do NOT delete existing Pretendard or other font declarations.
// In src/app/layout.tsx, add wfVisualSans.variable to <html className>:
//
//   <html lang={locale} className={`${pretendard.variable} ${wfVisualSans.variable}`}>
