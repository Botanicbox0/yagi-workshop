# MVP Polish Chain A — Public Surface

**When to use:** 토요일 아침 Visual Review 통과 후 Builder 첫 투입.
**Duration:** 3-4h (single polish pass, Gate Autopilot 아님)
**Prereq:** Phase 2.5 + 2.6 SHIPPED on main (2026-04-24 금요일 confirmed)

---

## Context for Builder (main worktree)

MVP Polish Chain A — Public Surface.

Phase 2.5/2.6 인프라 위에서 "공개 첫날 유저 이탈 방지"를 목표로 하는 **비-schema UI polish pass**.

### Scope (순차 진행, 각 항목 끝날 때마다 commit)

**A1. Landing page — Phase 2.5 challenges 노출**
- `src/app/[locale]/page.tsx` (landing) Hero 아래 영역 audit
- "지금 열려 있는 챌린지" 섹션 추가:
  - `src/lib/challenges/queries.ts` 의 `listPublicChallenges({ state: 'open', limit: 2 })` consume
  - 카드 2개 가로 배치 (모바일 세로 스택)
  - 각 카드: hero_media_url + 제목 + 남은 참여 기간 + "참여하기" CTA → `/challenges/[slug]`
- 열린 챌린지 0개: "곧 첫 챌린지가 올라와요" fallback
- YAGI 톤 (기존 landing 카피 mirror)

**A2. `/challenges` list page polish**
- Empty state: "첫 챌린지가 곧 올라와요" + 홈 CTA
- Loading state: spinner 제거 → `ChallengeCardSkeleton` 3-4개 그리드
- Hover: subtle lift (translateY -2px) + border accent
- 마감 < 24h: "곧 마감" pill (YAGI accent + 시계 아이콘)

**A3. `/challenges/[slug]` detail — 방문자 POV polish**
- Hero 아래: "참여 {N}명 | 마감 {relative time}" 메타 라인
- < 24h: hero 위 banner "⏰ 곧 마감됩니다"
- 본인 참여 완료: CTA "내 작품 보기" → 본인 submission 직링크
- 비로그인 CTA: `/auth/sign-in?redirect=` preserve

**A4. 404 / 500 YAGI 톤 재작성**
- `src/app/not-found.tsx` + `src/app/error.tsx` audit
- 404: "여기는 아직 아무도 없어요" + 홈/챌린지 CTA
- 500: "잠깐 문제가 생겼어요. 곧 고칠게요." + 재시도
- lucide-react 아이콘 1개 이하

**A5. 공통 Loading state upgrade**
- 현재 spinner 위치 audit
- Skeleton 더 맞는 곳: card grid, list
- Button 내부 spinner: 유지 (자연스러움), size/color 일관성 체크

### Execution policy

- Schema 변경 없음
- Dep 추가 없음 (lucide-react + tailwind + 기존 primitive 활용)
- A1~A5 순차, 각 항목 끝날 때 개별 commit (`feat(polish): A{N} <summary>`)
- 각 commit 후 `pnpm exec tsc --noEmit` + `pnpm lint` EXIT=0 확인
- Build는 A5 완료 후 한 번만

### Design reference

- yagi-design-system 준수 (monochrome + luminance emphasis)
- No chromatic accent (Phase 2.6 Webflow blue 유지)
- Typography: Bricolage Grotesque + Pretendard

### Deliverable

- 5 commits on main
- 최종 Telegram: "Chain A 완료"
- 야기 visual review 목록:
  - `/` landing hero + challenges 섹션
  - `/challenges` empty + loading + hover
  - `/challenges/[slug]` 메타 + banner
  - `/nonexistent-path` (404)
  - 폼 submit loading

### Stop triggers

- Schema / Dep 변경 시도
- tsc/lint fail 2회 연속
- SPEC에 문서화 안 된 landing 구조 → halt + 야기 결정 요청

실행 개시.
