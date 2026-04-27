# MVP Polish Chain C — Shareability

**When to use:** Chain A + B 완료 후 여유 있으면. 토요일 저녁 / 일요일.
**Duration:** 2-3h
**Prereq:** Chain A + B SHIPPED on main
**Priority:** OPTIONAL — MVP 공개 후로 넘겨도 무방

---

## Context for Builder (main worktree)

MVP Polish Chain C — Shareability.

유저가 SNS에 스크린샷/링크 공유할 때 "이거 잘 만든 서비스" 인상을 줄 수 있게 OG + 공유 동선 다듬기.

### Scope

**C1. `/api/og` route 개선**
- Phase 2.6 G4 에서 추가된 route 확인 (`src/app/api/og/route.ts`)
- 현재 렌더링 상태 audit — 간단한 기본 OG 이미지만 있을 가능성
- Challenge detail OG: hero_media_url 배경 + 챌린지 제목 + "yagiworkshop.xyz" watermark
- next/og 의 `ImageResponse` + edge runtime 유지
- 폰트 로드 최소화 (edge 한계 고려)

**C2. `/u/<handle>` OG 이미지**
- `/api/og?type=profile&handle={handle}` 패턴
- 배경: dark YAGI bg + avatar 원형 + display_name + "@{handle}" + "YAGI에서 만나보세요"
- 공유 시 `next.metadata.openGraph.images` 에 wire

**C3. Challenge detail 공유 버튼**
- `/challenges/[slug]` hero 아래 `<ShareButton>` 추가
- 기본: Web Share API (모바일 native 공유 시트)
- fallback: Twitter 공유 URL + 링크 복사 버튼
- lucide-react `Share2` 아이콘

**C4. Lighthouse 빠른 pass**
- `pnpm build` 후 production serve (`next start`)
- `/`, `/challenges`, `/challenges/[slug]` 3개 page 3G mobile throttle Lighthouse run
- LCP 4초 초과하는 page 만 개선 targeted fix
- 대부분은 image optimization (next/image width/height 명시, priority, placeholder)
- 수치만 Telegram 에 보고, 본격 성능 튜닝은 MVP 이후

### Execution policy

- Schema / Dep 변경 없음 (단, C1/C2 가 폰트 파일 추가 필요 시 Telegram halt 후 야기 결정)
- 각 항목 끝날 때 개별 commit
- tsc/lint EXIT=0 per commit

### Deliverable

- 3-4 commits on main (C4 는 실측 보고만, commit 없을 수도)
- Telegram: "Chain C 완료 — Lighthouse 결과 {scores}"

### Stop triggers

- Edge runtime 호환 안 되는 dep 필요 시 halt
- Lighthouse score 심각 하락 (LCP > 8s 등) 시 halt + 야기 결정 요청

실행 개시.
