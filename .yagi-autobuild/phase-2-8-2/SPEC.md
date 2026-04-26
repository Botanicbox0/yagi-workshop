# Phase 2.8.2 — Brief Board 본질 재설계 + 프로젝트 첫 인상

**Status:** v1 draft (web Claude 2026-04-26, post Phase 2.8.1)
**Duration target:** 5–6 working days (single worktree, no parallel)
**Predecessor:** Phase 2.8.1 SHIPPED (Workshop polish + terminology + auth UX)
**Successor:** Phase 2.10 (Workshop 본체 정의 100% — status machine + 승인/마감 + invoicing)
**Branch:** `g-b-2-redesign` (single worktree, linear)

---

## §0 — Why this phase

Phase 2.8 SHIPPED 직후 야기 manual K-PUX walking 에서 발견된 **본질 갭**:

> **B2.** "`/app/projects` 첫 인상 — 빈 화면 = 불친절. 카테고리별 워크플로우 설명 없어서 사용자 입장에서 '이 서비스 어떻게 쓰는 거야?' 혼란."
>
> **B3.** "Brief Board 가 너무 애매한 기능. 텍스트만 잘 들어가는 수준. **'이미지 + 영상 링크 + 텍스트 자유 결합 기획 보드'** (FigJam / Notion 수준) 로 와야 함."
>
> **B3-1.** "사이드바는 버전 기록 정도인데 차라리 실시간 채팅이 여기서 보여야."
>
> **B3-2.** "채팅 치는 사람 이름이 너무 작고 아바타 없어서 누구인지 헷갈림."

Phase 2.8 G_B SHIPPED scope 의 4개 block (text/image/file/embed) 은 **기능적으로 작동** 하지만 UX 적으로 사용 안 함 — discoverability 문제. 또한 linear document 모델 자체가 야기 의도 ("FigJam 수준 visual board") 와 차이.

이 phase 는 Brief Board 의 **본질을 다시 짓는** phase. v1 (Phase 2.8) 의 schema/RLS/server actions 는 그대로 유지, **에디터 UI + canvas + 사이드바 + comment author hierarchy** 만 재설계.

---

## §1 — Scope (sub-gates)

| Sub | Theme | Effort |
|---|---|---|
| **G_B2-A** | `/app/projects` 첫 인상 — 카테고리 워크플로우 onboarding + "프로젝트 의뢰하기" + admin delete | 1 day |
| **G_B2-B** | Brief Board discoverability — toolbar UI + slash command + drag-drop overlay | 1.5 days |
| **G_B2-C** | Brief Board canvas mode 추가 — linear document ↔ canvas 토글, freeform 배치 | 2 days |
| **G_B2-D** | Brief Board 사이드바 → 실시간 채팅 우선 + version history collapsed | 0.5 day |
| **G_B2-E** | Comment author visual hierarchy — 아바타 + 이름 typography + role badge | 0.5 day |
| **G_B2-F** | `/ko/commission` 삭제 검토 + Codex K-PUX 1차 시도 (gpt-5.5 토큰 reset 후) 결과 흡수 | 0.5 day |

**총합:** 6 days. Phase 2.10 진입 직전 buffer 없음 (1주 안에 SHIPPED).

---

## §2 — G_B2-A — `/app/projects` 첫 인상 onboarding

### Trigger
야기 발화: "지금은 너무 설명이 없어서 불친절한 서비스처럼 느껴짐. 이미지 1번 (브랜덴진 셀프 캠페인) 처럼 들어갔을 때 어떤 워크플로우인지 미리 파악할 수 있었으면."

야기 첨부 reference: 브랜덴진 "셀프 캠페인" 페이지 — 좌측 영역에 **3가지 핵심 가치 + "캠페인 생성하기" CTA + 우측에 실제 사례 카드** + **하단에 4-step 진행 흐름** ("캠페인 시작 → 큐레이터 확정 → 제품 발송 → 콘텐츠"). 야기 의도: 동일 패턴을 YAGI Workshop 에 적용.

### Scope

1. **빈 상태 onboarding 카드** — `/app/projects` 가 빈 리스트일 때 또는 첫 진입 시 노출되는 large hero card. 구성:
   - 좌측: 3개 핵심 가치 ("AI 시각물 자유 의뢰", "기획부터 납품까지 한 흐름", "전담 디렉터 매칭") + "프로젝트 의뢰하기" primary CTA
   - 우측: 실제 사례 카드 1-2개 (placeholder 이미지 + 카피) — Phase 2.10 까지 placeholder, 실 사례는 차차 교체
   - 하단: 4-step 진행 흐름 ("의뢰 작성 → 디렉터 매칭 → 기획 보드 협업 → 납품 + 결제")
2. **"직접 의뢰" → "프로젝트 의뢰하기"** 전체 surface 라벨 변경:
   - 사이드바, breadcrumb, 페이지 title, button label
   - i18n key value 변경 (key 이름 보존)
3. **카테고리별 워크플로우 설명** — wizard Step 1 의 카테고리 선택 시 각 카테고리 hover/click 에 작은 popover:
   - "이미지: 컨셉 → 모델 학습 → 생성 → 보정 (1-2주)"
   - "영상: 스토리보드 → 모델/씬 학습 → 생성 → 편집 (2-4주)"
   - "디지털 휴먼: AI twin 학습 → 액션/의상 → 합성 → 보정 (3-6주)"
   - 등등 (8개 카테고리)
4. **Admin 프로젝트 삭제** — `yagi_admin` only:
   - 프로젝트 detail 페이지 dropdown menu 에 "삭제" 옵션
   - confirmation dialog ("이 작업은 3일 이내 복구 가능합니다")
   - `projects.deleted_at` timestamp 컬럼 추가 (migration)
   - 클라이언트 view 에서 deleted_at IS NOT NULL 인 row 자동 hidden (RLS update)
   - admin "휴지통" surface 새로 만듦 — 3일 이내 복구 / 영구 삭제
   - cron: deleted_at + 3 days 경과 시 자동 hard delete (assets 포함 cascade)

### EXIT
- [ ] 빈 상태 onboarding card 컴포넌트 작동 (`/app/projects` 진입 시 노출)
- [ ] 4-step 진행 흐름 시각 표시
- [ ] "프로젝트 의뢰하기" 라벨 일관 적용 (sidebar, button, breadcrumb 모두)
- [ ] 8개 카테고리 워크플로우 popover 표시
- [ ] Admin delete + 3일 복구 작동 (UI + migration + RLS + cron)
- [ ] 클라이언트 계정으로 deleted 프로젝트 안 보임 검증
- [ ] tsc + lint + build exit 0

### FAIL on
- 라벨 변경이 i18n key 이름 변경 (비호환)
- soft delete 가 RLS 검증 못 통과 (cross-tenant leak)
- cron 가 deleted_at 보존 권한 없음

### Rationale
빈 surface = 불친절. AI 제작 합의 시스템의 **첫 인상이 "이렇게 작동합니다"** 라는 명시 안내로 시작해야 vendor/host 비대칭 모델이 자연스럽게 전달됨.

---

## §3 — G_B2-B — Brief Board discoverability (toolbar UI + slash command)

### Trigger
Phase 2.8 G_B SHIPPED 후 야기: "Brief Board 가 솔직히 너무 애매한 기능. 텍스트만 넣는 수준."

원인 진단:
- 4개 block type (text/image/file/embed) 작동하지만 UI 가 **TipTap default toolbar 만 제공** — H1/H2/H3 / B / I / S / list / quote
- Image / File / Embed 삽입 방법이 사용자에게 노출 안 됨 (drag-drop 만 가능, slash command 없음)
- "Type / to insert a block" hint 가 i18n 에 있지만 slash command 미구현 (FU-2.8-slash-command-deferred)

### Scope

1. **Toolbar 확장** — TipTap default 위에 추가 항목:
   - 이미지 삽입 (icon 버튼) → file picker 또는 drag-drop area show
   - 파일 첨부 (icon 버튼)
   - URL embed (icon 버튼) → URL 입력 modal → preview fetch (oEmbed)
   - 구분선 / Heading / 인용
2. **Slash command 구현** — `@tiptap/suggestion` + `tippy.js` 추가 (DECISIONS_CACHE Q-083 sibling rule 적용 — same publisher TipTap monorepo, no HALT):
   - `/` 입력 → 검색 가능한 block picker popup
   - 키보드 navigation (↑↓ + Enter)
   - 아이템: paragraph / heading 1/2/3 / bullet / ordered list / divider / image / file / embed / quote
3. **Drag-drop overlay 강화**:
   - 에디터 영역 drag-over 시 dashed border + "이미지를 끌어다 놓으세요" 큰 안내
   - 다중 파일 동시 drop 지원 (현재 single file only 가정)
4. **Empty state 구체화**:
   - 빈 보드에 placeholder text 추가: "텍스트를 입력하거나 / 를 눌러 블록을 삽입하세요"
   - 처음 진입한 사용자가 행동 방향 즉시 파악

### EXIT
- [ ] Toolbar UI 5개 추가 버튼 (이미지/파일/embed/구분선/heading) 작동
- [ ] slash command popup 키보드 navigation OK
- [ ] 다중 파일 drag-drop 지원
- [ ] 빈 보드 empty state 명확
- [ ] `@tiptap/suggestion` + `tippy.js` exact-pinned (3.22.4 같은 매트릭스)
- [ ] tsc + lint + build exit 0
- [ ] 한국어 IME 회귀 없음 (Phase 2.8.1 G_B1-G e2e 통과 확인)

### FAIL on
- slash command popup 이 한국어 IME composition 깨뜨림
- toolbar 가 mobile 뷰포트에서 깨짐

### Rationale
discoverability = product 가치 전달의 첫 관문. Phase 2.8 의 4개 block 이 작동해도 사용자가 못 찾으면 0가치. Notion / Figma 의 검증된 UI 패턴 (toolbar + slash) 그대로 가져옴.

---

## §4 — G_B2-C — Canvas mode (freeform 배치)

### Trigger
야기 framing: "Figma·FigJam처럼 시각적으로 펼쳐지고". Phase 2.8 의 linear document 모델은 Notion 쪽에 가깝고 Figma 감각은 부재.

### Scope

1. **Editor mode 토글** — Brief Board 우상단에 mode 스위치:
   - **Document mode** (기본, Phase 2.8 그대로): TipTap linear flow
   - **Canvas mode** (신규): freeform 2D 배치, zoom/pan
2. **Canvas 라이브러리 결정** — 두 옵션 비교:

| Lib | Pros | Cons | Verdict |
|---|---|---|---|
| **tldraw** | React-native, 깔끔한 API, 활발한 community, MIT | bundle size 큼 (~200KB gzip), 우리 design system과 ConflictPotential | 후보 1 |
| **excalidraw** | 손그림 톤, 협업 검증, 무료 | 손그림 스타일이 우리 design system 톤과 맞음, customizing 한계 | 후보 2 |
| 자체 구현 (HTML/CSS) | full control | 시간 + bug | 거부 |

**Decision:** **tldraw**. 우리 design system 의 강한 typography + 모노크롬 톤과 어울림. excalidraw 의 손그림은 YAGI 디자인 system 과 충돌.

3. **데이터 모델 통합** — content_json 안에 `canvas_state` 필드 추가:
```jsonc
{
  "type": "doc",
  "content": [...],          // TipTap linear (document mode)
  "canvas_state": {           // canvas mode (optional)
    "shapes": [...],          // tldraw shape array
    "viewport": { x, y, zoom }
  }
}
```
- mode 전환 시 둘 다 보존 (linear ↔ canvas 자유 toggle)
- 어느 mode 가 "정본" 인지 status 컬럼 추가 (`project_briefs.primary_mode = 'document' | 'canvas'`)
- 동일 보드의 두 mode 가 약간 다른 의미 가짐 — document = 합의된 기획안, canvas = 시각 brainstorm

4. **Canvas 안에 들어갈 것**:
   - 텍스트 블록 (free position)
   - 이미지 (drag-drop 또는 toolbar)
   - URL embed (canvas 위 작은 카드 형태)
   - 화살표 / 도형 (tldraw default)
   - 손그림 (tldraw default)
5. **Sync 보존** — document mode 의 image/embed 가 canvas mode 에서도 보임 (asset_id 기준)
6. **Mobile 대응** — canvas mode 는 mobile 에서 read-only (Phase 3.x mobile editor)

### EXIT
- [ ] tldraw 설치 + Brief Board 안 mount
- [ ] mode toggle UI (right top corner)
- [ ] Canvas mode 에서 텍스트/이미지/embed 자유 배치
- [ ] mode 전환 시 데이터 보존 (linear ↔ canvas toggle 3회 후 양쪽 무손실)
- [ ] `project_briefs.primary_mode` migration
- [ ] Mobile read-only fallback
- [ ] tsc + lint + build exit 0
- [ ] Codex K-05 PASS (canvas data model + RLS validation)

### FAIL on
- tldraw 가 우리 design system token (CSS variables) 과 conflict
- canvas state 가 5MB jsonb cap 초과 (현재 제한)
- mode 전환 시 데이터 손실

### Rationale
야기 framing 의 "Figma·FigJam" 부분 직접 충족. Phase 2.8 G_B 가 Notion 쪽 가치만 채웠다면, 이 sub-gate 가 Figma 쪽 가치 채움. 두 mode 공존이 원칙 — 어느 한쪽으로만 갈 수 있는 product 보다 둘 다 가능한 product 가 야기 framing 과 정확히 align.

---

## §5 — G_B2-D — 사이드바 실시간 채팅 우선 + version history collapsed

### Trigger
야기: "사이드바는 버전 기록 정도인데 차라리 실시간 채팅이 여기서 보여야."

Phase 2.8 G_B 의 사이드바 = version history sidebar (collapsed default), 코멘트 thread 는 보드 아래 별 영역.

### Scope

1. **사이드바 재구성** — 우측 collapsible panel 두 tab:
   - **메시지 tab (default)** — 실시간 thread (현재 BriefCommentPanel)
   - **버전 기록 tab** — VersionHistorySidebar (현재 default)
2. **메시지 tab 강화**:
   - 입력 영역 sticky bottom (현재 inline)
   - 새 메시지 도착 시 toast 알림 + tab badge
   - 미읽 메시지 indicator
3. **Realtime subscription** — Supabase realtime 으로 새 thread message INSERT 즉시 panel 업데이트 (현재 page reload 필요)
4. **버전 기록 tab 유지** — 현재 UI 그대로, 단지 default 가 아닌 secondary tab

### EXIT
- [ ] 사이드바 두 tab UI 작동
- [ ] 메시지 tab default
- [ ] Realtime subscription 으로 새 메시지 즉시 표시
- [ ] 미읽 indicator + tab badge
- [ ] 버전 기록 tab 현재 기능 유지
- [ ] tsc + lint + build exit 0

### FAIL on
- realtime subscription 이 RLS 우회 (다른 project 메시지 노출)
- tab 전환 시 현재 작성 중 메시지 lost

### Rationale
브리프 보드 = 합의 cycle 의 living document. 합의 = 대화. 대화 = 사이드바의 primary surface 여야. 버전 기록은 secondary (자주 안 봄).

---

## §6 — G_B2-E — Comment author visual hierarchy

### Trigger
야기: "채팅 치는 사람 이름이 너무 조그맣게 나와있고 아이콘도 없고 텍스트만 띡 있어서 어떤 사람인지 좀 헷갈림."

Phase 2.8 의 BriefCommentPanel — 메시지 위에 작은 텍스트 "yagi" 만, 아바타 없음.

### Scope

1. **메시지 author 디스플레이 재설계**:
   - 큰 아바타 (32x32, 이전 16x16)
   - 표시 이름 명확 typography (semibold, foreground color)
   - role badge ("YAGI" 또는 "Client" 또는 "Admin") — 비대칭 명시
   - 시각 차별화: YAGI 멤버 = subtle accent border, 클라이언트 = neutral
2. **Avatar fallback** — `profiles.avatar_url` 없으면 initials + 색상 (display_name 기반 deterministic)
3. **Self-message 시각 차이** — 본인 메시지 우측 정렬 + accent bg, 상대 메시지 좌측 + neutral
4. **Mention 알림** — `@yagi`, `@client` 같은 mention 가능 + 알림

### EXIT
- [ ] 32x32 아바타 모든 메시지에 표시
- [ ] role badge 4종 (YAGI / Admin / Client / Member) 정확
- [ ] Avatar fallback (initials + color) 작동
- [ ] Self / 상대 메시지 좌우 차별
- [ ] Mention 작동 + 알림
- [ ] tsc + lint + build exit 0

### FAIL on
- avatar_url 이 외부 URL 일 때 CORS / 보안 이슈
- mention 으로 알림이 발송되지 않을 사용자 (비참여자) 까지 노출

### Rationale
"누가 말했는지" 즉시 알아보는 visual hierarchy 는 합의 cycle 의 핵심 affordance. Frame.io / Slack / Linear 의 표준 패턴.

---

## §7 — G_B2-F — `/ko/commission` 삭제 검토 + Codex K-PUX

### Trigger

(1) 야기 발화 "이건 랜딩페이지로 편향될 사이트임. 삭제해도 됨" — Phase 2.7.2 funnel split 결정 재검토.
(2) Phase 2.8.1 시작 시 토큰 한도 걸렸던 Codex K-PUX 1차 시도 — gpt-5.5 토큰 reset 후 재실행.

### Scope

1. **`/ko/commission` 삭제 결정**:
   - 클라이언트 funnel: public landing → signup → `/app/projects` 만 남김
   - `/commission` 라우트 redirect 또는 제거
   - 메뉴/링크 sweep
2. **Codex K-PUX 1차 시도** — UTF-8 fix + gpt-5.5 토큰 reset 후:
```powershell
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Get-Content .yagi-autobuild\phase-2-8-1\_codex_kpux_prompt.md -Encoding UTF8 -Raw `
  | codex exec --model gpt-5.5 -c model_reasoning_effort=high `
  > .yagi-autobuild\phase-2-8-2\_codex_kpux_output.txt
```
3. **K-PUX 결과 검토** — 야기 + web Claude 같이 read, HIGH 항목 다음 phase (2.10) 흡수

### EXIT
- [ ] `/ko/commission` deletion 또는 redirect 결정 + 적용
- [ ] Codex K-PUX 결과 받음
- [ ] HIGH-PUX-A / HIGH-PUX-B 항목 분류 + Phase 2.10 SPEC 진입 시 흡수 계획
- [ ] tsc + lint + build exit 0

### FAIL on
- `/ko/commission` 삭제 후 외부 backlink 깨짐 (없을 가능성 높지만 검토)
- Codex 토큰 한도 또 걸림 → gpt-5.4 또는 야기 manual K-PUX 재 walking 으로 대체

### Rationale
미해결 항목 정리 + 외부 시각 K-PUX 흡수.

---

## §8 — Out of scope (deferred)

### → Phase 2.10
- **Status machine 완성** — draft → submitted → in_discovery → in_production → delivered → approved → archived 모든 transition + UI
- **Approval flow** — 클라이언트의 명시 승인 action + 알림
- **Invoicing surface** — `invoices` 테이블 + UI
- **Lock 후 변경 요청 fork 패턴**
- **Block 단위 inline comment** (TipTap stable block id + threads anchor_block_id)

### → Phase 3.0
- Contest surface 본격
- Creator Profile (`/c/{handle}`)

### → Phase 3.1+
- Real-time co-editing (Yjs / Liveblocks) — canvas mode 의 multi-cursor
- AI-assisted brief generation
- Frame.io 풍 영상 timestamp annotation
- Mobile-optimized canvas editor

---

## §9 — Risks & open questions

### R1 — Canvas mode bundle size
tldraw ~200KB gzip 추가. Brief tab 진입 시 lazy-load 권장.
**Mitigation:** Next.js dynamic import + Suspense fallback. canvas mode 진입 시점에만 load.

### R2 — Document ↔ Canvas 데이터 sync
두 mode 가 각자 데이터 가지면 발산 위험.
**Mitigation:** primary_mode 컬럼 + sync rule 명시: "asset_id 공유, 텍스트는 별 영역, 사용자가 mode 전환 시 confirm dialog ('현재 mode 의 변경사항 보존됩니다')".

### R3 — slash command + 한국어 IME
TipTap suggestion + tippy.js 가 한국어 자모 입력 시 popup 깜빡임 가능.
**Mitigation:** Phase 2.8.1 G_B1-G e2e 에 slash command + IME 케이스 추가. 회귀 발견 시 즉시 fix.

### R4 — Admin soft delete cascade
프로젝트 soft delete 시 brief / versions / assets 까지 cascade 안 하면 storage cost 누적.
**Mitigation:** cron 가 hard delete 시 cascade DELETE + R2 object 정리. 3일 이내는 모든 데이터 보존.

### Q1 — Canvas mode 가 Phase 2.10 으로 미뤄질지?
2 days 분량이 무거울 수 있음. 만약 G_B2-A + G_B2-B 가 예상보다 길어지면 G_B2-C 만 다음 phase 로 분리 가능.
**Decision tree:** G_B2-A + G_B2-B 끝낸 시점 (~2.5d) 에서 평가. 4d 안에 G_B2-C 마무리 가능 판단 → 진행, 아니면 Phase 2.10 으로.

### Q2 — Codex K-PUX 결과가 큰 갭 발견 시?
Phase 2.8.2 에 흡수 vs Phase 2.10 으로 미룸.
**Decision tree:** HIGH-PUX-A 1개 이상 = Phase 2.10 직전 1d 추가 sub-gate (G_B2-G). HIGH-PUX-B 만 = 2.10 으로.

---

## §10 — Definition of Done

전체 6개 sub-gate EXIT 모두 통과 + Codex K-05 review 통과 + main merge.

- [ ] G_B2-A: `/app/projects` onboarding + admin delete
- [ ] G_B2-B: toolbar + slash command + drag-drop
- [ ] G_B2-C: canvas mode (또는 Q1 결정대로 Phase 2.10 으로)
- [ ] G_B2-D: 사이드바 채팅 우선 + realtime
- [ ] G_B2-E: comment author visual hierarchy
- [ ] G_B2-F: commission deletion + K-PUX 흡수
- [ ] tsc + lint + build exit 0
- [ ] Codex K-05 (gpt-5.5) PASS
- [ ] manual smoke (10분): 야기가 wizard / Brief Board (두 mode) / 사이드바 채팅 / comment 한 번씩 검증

---

## §11 — Timeline budget

```
TARGET   = 6 working days
SOFT_CAP = 7 days
HARD_CAP = 9 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B2-A = 8
  G_B2-B = 12
  G_B2-C = 16
  G_B2-D = 4
  G_B2-E = 4
  G_B2-F = 4
  REVIEW = 2 (+ 4 per loop)
```

Total ≈ 50h work + 2h review = 6.5d. Buffer 0.5d → 6d 안에 SHIPPED.

---

## §12 — END

```
ON SHIPPED: Phase 2.10 SPEC 즉시 작성 시작 (web Claude)
            Phase 2.10 = Workshop 본체 정의 100% 도달
            Phase 3.0 = Contest 본격 (별 product, 별 SPEC, 별 worktree)
```

Phase 3 ETA (재계산):
- Phase 2.8.1 (5d) + Phase 2.8.2 (6d) + Phase 2.10 (~7d) + buffer = **약 3.5주 후 Phase 3 진입.**
