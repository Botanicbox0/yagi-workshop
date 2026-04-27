# MVP Polish Chain B — Creator First Impression

**When to use:** Chain A 완료 후, 토요일 오후.
**Duration:** 2-3h
**Prereq:** Chain A SHIPPED on main

---

## Context for Builder (main worktree)

MVP Polish Chain B — Creator First Impression.

Creator 첫 방문 시 "내가 이걸 왜 썼지" 의심 방지 + signup flow 마찰 제거.

### Scope

**B1. `/u/<handle>` empty state**
- 참여 작품 0개 케이스: 현재 "아직 참여한 챌린지가 없어요" 짧은 텍스트
- 업그레이드: 해당 메시지 + 열린 챌린지 1-2개 카드 (A1 재활용) + "첫 챌린지 참여해보세요" CTA
- 0개 상태는 본인 / 방문자 모두에게 이 UI. 본인에게만 CTA 강조는 과잉 — SPEC v3.1 §H 준수 (empty state no imperatives).
- 대안: 본인 프로필에만 별도 프롬프트, 외부 방문자는 중립 카피. 판단 명시.

**B2. 프로필 header Instagram emphasis**
- 현재 Instagram handle 표시 방식 audit
- Instagram 아이콘 (lucide-react) + @handle linked to `https://instagram.com/{handle}` external
- 링크 target="_blank" rel="noopener noreferrer"

**B3. Signup role 선택 step 설명 추가**
- `src/app/auth/sign-up/*` role 선택 surface audit
- 각 role 카드 아래 1문장 설명:
  - Creator: "챌린지 참여하고 작품 공유해요"
  - Studio: "팀으로 챌린지 도전해요"
  - Observer: "구경만 할게요"
- 카피 YAGI 톤 (부드러운 declarative)

**B4. Instagram handle 필수 설명 툴팁**
- signup 또는 settings 프로필 form 의 Instagram handle 입력란
- 라벨 옆 small info 아이콘 (lucide-react `Info`)
- 호버/탭 시 툴팁: "선정되면 공개 축하 태그에 필요해요"
- Radix `<Tooltip>` 기존 primitive 활용

### Execution policy

- Schema / Dep 변경 없음
- B1~B4 순차, 개별 commit (`feat(polish): B{N} <summary>`)
- tsc/lint EXIT=0 per commit

### Deliverable

- 4 commits on main
- Telegram: "Chain B 완료"

### Stop triggers

- Schema / Dep 변경 시도
- tsc/lint fail 2회 연속
- SPEC 미정의 영역 → halt + 야기 결정

실행 개시.
