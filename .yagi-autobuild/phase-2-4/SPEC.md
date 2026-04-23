# Phase 2.4 — Design Token Update (post-X1 retrofit)

Version: 1.0
Status: DRAFT
Owner: B-O-E
Protocol: ADR-005 Expedited Phase Protocol
Predecessor: Phase 2.5 X1 (status palette + share retoken commits f2815f1, c6040bc, 8121538, ade027f)
Successor: Phase 2.5 G2 (backend API)
Created: 2026-04-23

## 0. Mission
Phase 2.5 X1 retrofit이 semantic token 사용을 정상화했다. 이 phase는 그 위에
Webflow design language를 박는다: blue dual accent, WF Visual Sans display font,
dark mode 제거, 9-step gray scale.

## 1. Why now
- Phase 2.5 X1이 hardcoded 색상을 semantic token으로 옮김 (9/13 CRITICAL closed)
- 그러나 토큰 정의 자체는 amber accent / no display font / dark block 잔존
- Phase 2.5 G3 (frontend list/detail) 진입 시 새 토큰 정의가 박혀있어야 challenge UI가
  Webflow 톤으로 빌드됨
- G1 (DB migration + auth) 동안 병렬 작성, G2 직전 머지 가능

## 2. CEO decisions captured (4)
| # | 차원 | 결정 |
|---|---|---|
| C1 | Accent blue | #146EF5 (Webflow primary) + #4353FF (softer variant) 듀얼 |
| C2 | Bundle C scope | 3 화면 retrofit (랜딩/로그인/대시보드), 1일 |
| C3 | Dark mode | globals.css .dark block 완전 제거 (light-only) |
| C4 | Display font | WF Visual Sans (라이센스 보유, ADR-007) |

## 3. Scope

### In
- ADR-007 commit (DECISIONS.md append)
- PRINCIPLES.md amend (§3, §6)
- TYPOGRAPHY_SPEC.md amend (§3.1, §3.2, §5.1, §10, §15 신규)
- REFERENCES.md amend (Webflow product/brand split)
- globals.css rewrite (dark 제거, accent dual, 9-step gray, @font-face)
- fonts.ts amend (WF Visual Sans local font)
- tailwind.config.ts extend
- 3 screen retrofit (landing/login/dashboard) — visual review per screen

### Out (Phase 2.7+ deferred)
- 미팅, 인보이스, showcases, 저널, 공유, 프리프로덕션, 어드민, team 8 화면
- L2 (src/design-tokens/*.ts) 자동 생성
- Marketing surface 별도 typography spec
- Storybook setup
- WF Visual Sans Text variant

## 4. Gates (mini-version per ADR-005)
- G1 Foundation Patches (3-4h) — staging → production 적용 + build pass + visual sanity
- G2 Audit + Inventory (2-3h) — DESIGN_REVIEW.md re-score post X1, RETROFIT_PRIORITY 갱신
- G3 Critical Retrofit (5-6h) — 3 화면 × visual review
- G4 Codex K-05 (1h)
- G5 Closeout (1h)

야기 stop point: G2 review (1) + G3 visual review (3) = 4회

## 5. Acceptance criteria
1. ADR-007 commit + Index 갱신
2. 5 design-system docs amend complete
3. globals.css dark block absent
4. Webflow blue tokens active
5. WF Visual Sans @font-face + next/font local 등록
6. 3 화면 retrofit + 야기 visual review pass
7. Codex K-05 CLEAN or MEDIUM 1 이내
8. CHANGELOG.md [0.2.0] section

## 6. Reference
- ADR-005 → docs/design/DECISIONS.md
- ADR-007 → docs/design/DECISIONS.md (이 phase에서 작성)
- DESIGN_REVIEW.md → .yagi-autobuild/reviews/DESIGN_REVIEW.md
- ARCHITECTURE.md L1/L2/L3 model → .yagi-autobuild/ARCHITECTURE.md
- Phase 2.5 SPEC v2 → .yagi-autobuild/phase-2-5/SPEC.md (frozen at 5440954)
- Phase 2.5 X1 audit → .yagi-autobuild/design-audit/CRITICAL.md

## §7 — Pre-G1 audit findings
현재 src/app/fonts.ts가 Fraunces+Inter를 사용 중임이 사전 audit에서 확인됨. ADR-002 'Pretendard sole font' 결정과 코드 사이의 drift. fonts-proposed.ts v1은 이를 가정하지 않았음 → fonts-proposed-v2.ts로 교체 + G1-EXECUTION-HANDOFF Step 2 amend로 full replacement 처리. ADR-002에 reflect할 changelog는 별도 ADR-008에서 (deferred).
