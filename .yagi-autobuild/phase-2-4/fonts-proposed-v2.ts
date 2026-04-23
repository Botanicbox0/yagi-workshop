// ============================================================================
// fonts.ts — Phase 2.4 PROPOSED amend v2
//
// Source:  .yagi-autobuild/phase-2-4/fonts-proposed-v2.ts
// Target:  src/app/fonts.ts (REPLACE entire file at G1)
//
// v2 change vs v1:
//   - Phase 2.4 사전 audit에서 현재 fonts.ts가 Fraunces+Inter임이 확인됨
//     (commit 검증 시점 기준).
//   - ADR-002 "Pretendard sole font" decision은 코드에 reflect되지 않은
//     상태였음 (silent drift). v2 amend에서 Pretendard 등록 + Fraunces/Inter
//     완전 제거.
//   - WF Visual Sans 추가 (ADR-007).
//
// Per ADR-002 + ADR-007:
//   - Pretendard for body/UI/Korean (sole)
//   - WF Visual Sans for display only (EN context)
// ============================================================================

import localFont from 'next/font/local';

/**
 * Pretendard Variable — body/UI font (sole font per ADR-002)
 *
 * License: SIL OFL 1.1 (see public/fonts/Pretendard-LICENSE.txt)
 * Source:  public/fonts/PretendardVariable.woff2 (variable font, weights 100-900)
 *
 * Used for:
 *   - All body, label, caption, code roles
 *   - All Korean text regardless of role (no exceptions per ADR-007)
 *   - All product UI surfaces unless explicitly overridden by display role
 *
 * Loading strategy: preload (body font, eager).
 */
export const pretendard = localFont({
  src: [
    {
      path: '../../public/fonts/PretendardVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ],
});

/**
 * WF Visual Sans — display font (per ADR-007)
 *
 * License: yagi의 Webflow Team 계정 포함 계약에 근거 (ADR-007).
 *          Evidence chain boost는 follow-up phase에서.
 * Source:  public/fonts/WFVisualSansVF.woff2 (variable font, weights 100-900)
 *
 * Display roles only (per TYPOGRAPHY_SPEC.md §15):
 *   - display-lg / display-md / display-sm
 *   - landing/marketing 표제어
 *   - label-lg (EN context only — KR remains Pretendard)
 *   - EN section titles where geometric character is desired
 *
 * Loading strategy: lazy (display font, marketing surfaces).
 * KR display fallback → Pretendard at same role (no Hangul glyphs in WF Visual Sans).
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

// ============================================================================
// REMOVED in v2 (silent drift cleanup):
//   - Fraunces (next/font/google)  — never sanctioned by any ADR
//   - Inter   (next/font/google)   — superseded by Pretendard's embedded Latin
//
// Both were present in src/app/fonts.ts at audit time but had no ADR backing.
// Removing closes the ADR-002 drift gap.
// ============================================================================
//
// At G1 — layout.tsx update (src/app/[locale]/layout.tsx or wherever
// <html className> is set):
//
//   Old:
//     import { fraunces, inter } from '@/app/fonts';
//     <html className={`${fraunces.variable} ${inter.variable}`}>
//
//   New:
//     import { pretendard, wfVisualSans } from '@/app/fonts';
//     <html lang={locale} className={`${pretendard.variable} ${wfVisualSans.variable}`}>
//
// Verify after G1 (Step 10 visual sanity):
//   - DevTools > Network: only PretendardVariable.woff2 + WFVisualSansVF.woff2
//     loaded. No fonts.googleapis.com requests.
//   - DevTools > Computed: body text computed font-family resolves to
//     "Pretendard Variable", not Fraunces or Inter.
//   - Visual: H1 on landing uses WF Visual Sans, body uses Pretendard,
//     KR text uses Pretendard at all roles.