# Handoff — Phase 2.7.1 SHIPPED → "Product Refinement" Session

**Created:** 2026-04-25 late evening
**Trigger:** 야기 결정 — 새 chat에서 "더 좋은 제품화" 작업 시작
**Status:** Phase 2.7.1 SHIPPED 완료. 9 patches in 3 commits. 새 chat 시작 준비 완료.
**For:** 새 chat 첫 메시지에 이 파일 전체 붙여넣기

---

## ⚡ 새 chat 첫 메시지 (이 블록 전체 복붙)

```
야기. 이전 chat에서 핸드오프 받았다. YAGI Workshop 플랫폼 "더 좋은 제품화" 작업 시작.

핵심 focus:
1. 사용성 향상 (UX 가시성, 정보 hierarchy)
2. 불필요한 탭/메뉴 정리, 워딩 통일
3. 탭 추가/제거/병합 결정
4. 디자인 완성도 (light mode, Webflow 톤 참고)

기능 자체는 어느 정도 구현됨. 여기서부터는 polish + 클리어함 + 사용성.

전체 컨텍스트는 아래 핸드오프 문서에 있음. 메모리에도 일부 저장됨.

먼저 현재 상태 점검부터 같이 하자.

[다음 메시지에 핸드오프 문서 전체 붙여넣음]
```

---

## Section 1 — 어디까지 왔는가 (2026-04-25 저녁 기준)

### Phase Ship 상태 (모두 main 브랜치에 머지됨)

| Phase | 상태 | 핵심 산출물 |
|---|---|---|
| Phase 2.5 (Challenge) | ✅ SHIPPED | 챌린지 surface, R2 submissions, 우승자 발표, gallery |
| Phase 2.6 (IA Revision) | ✅ SHIPPED | sidebar 4-group, scope-switcher, help-link, mobile drawer |
| Phase 2.7 v2 (Commission Soft Launch) | ✅ SHIPPED | clients table, commission_intakes, sponsor_client_id, /commission landing |
| **Phase 2.7.1 (Visibility Polish)** | ✅ **SHIPPED (방금)** | 9 patches: bug fix + italic 제거 + lang switcher + role badge + max-width + sidebar 정리 + i18n 통일 + scope switcher 명확화 + Webflow light tone |

### Phase 2.7.1 적용 내역 (3 commits)

**Commit 1 `bd77e24`**
- **P1** — `/projects/new` Radix Select sentinel `__none` for empty value (runtime crash fix)
- **P2** — italic/`<em>` 일괄 제거: sidebar trigger + 5 admin headers + project wizard intake/refs labels (사용자 markdown italic은 보존)
- **P6** — Sidebar 작업 group 정리: commission + challenges만 유지. lucide imports tightened.

**Commit 2 `b018aeb`**
- **P3** — `<LanguageSwitcher>` (next-intl Link) + `<PublicChromeHeader>` for fixed top-right on public surfaces, hidden on `/app/*`. 앱 shell header에는 PageHelpLink + NotificationBell 옆에 마운트.
- **P4** — Role badge `@handle · Role` in sidebar user menu. `getRoleLabel()`이 YAGI Admin / Internal / Creator / Studio / Client / Observer를 workspace+profile precedence로 resolve.
- **P11** — Scope switcher dropdown sectioned: Workspaces / Admin / Profile labels with Check on active.

**Commit 3 `ddd9a66`**
- **P5** — App layout `max-w-6xl mx-auto px-6 lg:px-8 py-8`
- **P9** — i18n 정리: 공모전→챌린지, 클라이언트→의뢰인 (admin response_help), role_v2 titles canonical Korean (크리에이터/스튜디오/관찰자/의뢰인); ROLE_LABEL_KO email template synced; Phase 1.x projects keys preserved per scope.
- **P12** — Light-mode tokens only: `--background` 100→98%, `--accent` 97→95%, `--border` 92→90%; top-of-page H1 bumped to `text-4xl md:text-5xl leading-[1.05]` on dashboard/admin/admin commissions/commission; sidebar group label `text-[11px] text-foreground/65`; nav item resting `text-foreground/85`, active gains `font-semibold`.

### Verification

- ✅ `pnpm exec tsc --noEmit` clean
- ✅ `pnpm build` clean
- ✅ `pnpm lint` clean
- ✅ Schema 변경 없음
- ✅ Dep 변경 없음

### Codex 모델

- **GPT-5.5** (2026-04-25 야기 directive로 5.4 → 5.5 업그레이드 완료)
- Backup: `~/.codex/config.toml.5-4-backup`
- Phase 2.7.1 K-05 생략 (UI/token only, 보안 영향 없음)
- **다음 K-05 호출은 Phase 2.8 시작 시점** — 5.5의 첫 verdict 검증 시점 (5.4 비교)

### MVP Launch Timeline (현재 상태)

- 토 (오늘) ~22:30: Phase 2.7.1 SHIPPED ✅
- 토~일 새벽: 야기 visual re-check (이 핸드오프 후 새 chat에서 진행)
- 일 종일: 정리 + Phase 2.8 spec + 런칭 자료 + Dana 협업
- **월 새벽: 🚀 공개 (변경 없으면)**

---

## Section 2 — 비즈니스 모델 (재확인)

### YAGI Workshop 정체성

- AI Native Entertainment Studio
- 3 비즈니스 축: AI 트윈 제작 / 브랜딩&IP / 콘텐츠·광고 제작·유통
- 청창사 2026 참여, 1인 법인 (윤병삼 88% / 남다나 12%)

### 플랫폼 (yagi-workshop Next.js app) 비즈니스 모델 v2

**Two tracks:**

1. **AI VFX 의뢰 (commission_intakes)** — 메인 매출원
   - 엔터 레이블, 광고 에이전시, 아티스트가 의뢰
   - 영상 링크/파일 + brief markdown + timestamp 메모
   - YAGI가 manual하게 견적 상담 → 작업 → 납품
   - 중개 수수료 15%

2. **Sponsored Challenge** — 보조 매출 + 마케팅 funnel
   - 삼양 같은 회사가 챌린지 후원 → YAGI가 기존 challenge surface 에 게시
   - 후원료 수익
   - Creator 발굴 + 포트폴리오 채널

**Phase 2.8 deferred (FOLLOWUPS.md):**
- Interactive timeline annotation player (영상 위 click-to-mark UI) — 진짜 차별점
- Creator proposal marketplace
- Contract PDF + sign flow
- Project workspace (milestones / messages / deliverables)
- Portfolio surface
- Premium redesign 풀 적용
- R2 file upload wire (intake form 첨부)
- Notification fan-out
- Atomic two-table SECURITY DEFINER RPC for client signup
- Sponsor picker on challenge edit page
- Scope-switcher company_name display

---

## Section 3 — 진단된 7가지 가시성 문제 (해결 진행도)

| # | 문제 | Phase 2.7.1 해결도 | 남은 작업 |
|---|---|---|---|
| A | Information hierarchy 무너짐 | 부분 (P12 typography hierarchy, H1 bumped) | 본격 hierarchy v2 — Phase 2.8 |
| B | Contrast 부족 | 부분 (P12 sidebar contrast strengthened) | Dark mode 결정 + token rework |
| C | 용어 혼선 | **거의 해결** (P9 i18n 통일: 의뢰/챌린지/의뢰인/후원사) | 최종 visual review 후 추가 발견 |
| D | Role/Context 불투명 | **해결** (P4 role badge + P11 scope switcher sectioning) | - |
| E | Empty state 약함 | **미해결** | Phase 2.7.2 또는 Phase 2.8 — role별 dashboard |
| F | Sidebar 항목 너무 많음 | **해결** (P6 정리: 작업 group → commission + challenges만) | - |
| G | Public ↔ App 경계 불분명 | 부분 (P3 LanguageSwitcher가 public/app 차별화) | 추가 검토 필요 |

---

## Section 4 — 새 chat에서 논의할 핵심 주제 (우선순위 순)

### 4-1. Visual re-check (가장 먼저 — 15분)

새 chat의 첫 task. dev server에서 9 patches 모두 작동 확인:

- [ ] `/ko/app/projects/new` runtime error 해결?
- [ ] italic 일괄 제거 됨? (워드마크, admin 헤더, 등)
- [ ] KO/EN toggle 모든 페이지 작동?
- [ ] Sidebar 하단 role badge "@handle · Role" 표시?
- [ ] `/ko/app/*` content 좌우 균형 (max-w-6xl)?
- [ ] Sidebar work group: commission + challenges만 노출?
- [ ] 용어 일관 (의뢰/챌린지/의뢰인/후원사)?
- [ ] Workspace switcher dropdown: Workspaces/Admin/Profile section divider + ✓?
- [ ] Webflow light tone (off-white bg, 큰 H1, sidebar contrast)?

### 4-2. Tab/Menu 정리 결정 (야기 명시 우선순위)

**현재 sidebar (Phase 2.7.1 후):**

```
작업
  - 내 의뢰 (client persona)
  - 챌린지 ▾ (yagi_admin)
    - 전체 챌린지
    - 새 챌린지
    - 진행 중

소통
  - 미팅
  - 알림
  - 팀

결제 ▾
  - 받은 송장
  - 발행 송장

시스템
  - 설정
  - YAGI 관리 (yagi_admin)
  - 의뢰 관리 (yagi_admin)
```

**다음 chat에서 결정할 것:**

#### 소통 group — 미팅 / 알림 / 팀
- Phase 1.x 부터 존재. 의도? 클라이언트와 미팅 잡는 surface?
- "팀" 페이지 — 무슨 팀? 워크스페이스 멤버 관리?
- **만약 비활성/혼란이라면 정리 또는 통합**

#### 결제 group — 송장 (invoice)
- Phase 1.x. 현재 활용도?
- 의뢰 마무리 후 invoice 발행 자동화? 또는 수동?
- Phase 2.8 escrow 도입 시 통합?
- "받은 송장 / 발행 송장" 분리 의미 있나?

#### admin 분산 — YAGI 관리 / 의뢰 관리 / 시스템 그룹
- yagi_admin에게 admin surface가 분리되어 보임
- 한 곳 통합? 또는 각각 분리 유지?
- "YAGI 관리" / "의뢰 관리" 라벨 통일?

#### 새 surface 필요?
- **포트폴리오** — Phase 2.8 deferred. sidebar 자리 미리 확보?
- **분석/통계** — 의뢰 funnel, 챌린지 reach 등 — Phase 3+
- **공지사항** — 사용자 onboarding / 업데이트 알림 — small win

### 4-3. 워딩 추가 통일

P9 후 발견될 수 있는 미세한 inconsistency:
- 버튼 라벨 ("저장" vs "보내기" vs "제출" vs "등록")
- Empty state 톤 ("아직 …이 없습니다" 일관 / 격려 톤 vs 평이한 톤)
- Error/success message 톤
- Public 페이지 카피라이트 vs app 페이지 카피라이트 톤 차이

### 4-4. 디자인 완성도 — Phase 2.8 본격 redesign

야기 의도: "디자인적인 완성도를 높이고 싶음"

**검토 포인트:**
- Reference visual board 만들기 (Webflow / Linear / A24 등에서 캡처 모음 → Figma board)
- Dark mode 도입 여부 결정 (public vs app vs 양쪽, light는 유지로 결정됨)
- Font 추가 결정 (Migra 구매 vs Playfair Display 무료)
- Motion system 결정 (Framer Motion 기본, GSAP 추가 X)
- Image asset 전략 (Unsplash cinematic vs 자체 촬영 vs Dana curate)

**Tool 선택 — 이전 chat 권고:**
- 야기 제안: Antigravity + Gemini 3 Pro High
- 권고: 일단 보류, Claude Sonnet + frontend-design skill로 충분
- 진짜 빛나는 영역: image-to-code (Figma mockup 있을 때 Gemini 시도 가치)
- **대안 워크플로우**: Figma high-fidelity mockup → Claude Sonnet 으로 component 생성 → 1페이지만 Antigravity로 비교

### 4-5. Phase 2.8 spec 작성

큰 그림 정리:
- Marketplace (proposals, contracts, milestones)
- Annotation player (영상 + timestamp click-to-mark) ← 핵심 차별점
- Project workspace (3-way messaging, deliverables)
- Portfolio surface (`/u/[handle]/portfolio`)
- Premium redesign 풀 (landing, commission, challenges, profile)

Multi-agent peak parallelism 기회 (5 worktrees 동시).

### 4-6. 1주 / 2주 / 1개월 마일스톤

MVP 공개 후:
- **Week 1**: 첫 의뢰 들어오는지 monitor, manual response 운영
- **Week 2**: Phase 2.8 G1-G2 (annotation player + marketplace 시작)
- **Month 1**: Phase 2.8 SHIPPED, Sponsored challenge 1-2건 운영, 사용자 feedback 수집

---

## Section 5 — Multi-agent 활용 reality check

### 현재 인프라 (계속 유효)

- B-O-E 시스템 (Builder Opus 4.7 / Orchestrator Sonnet 4.7 / Executor Haiku)
- Agent Teams (in-process mode, Warp Windows)
- Parallel worktree pattern (`claude -w g{K}-{slug}`)
- Phase 2.5 G3에서 첫 실전 (3 teammates 병렬 PASS)

### Phase별 활용도 reality check

| Phase | 병렬화 가능성 | 실제 활용 |
|---|---|---|
| 2.5 | 높음 | ✅ G3 Group A (Haiku×2 + Sonnet×1 PASS) |
| 2.6 | 중간 | ✅ G2/G4 일부 |
| 2.7 v2 | 낮음 (sequential schema → UI dep) | ❌ 단일 (5 gates × 빠른 chain이 더 효율적) |
| 2.7.1 | 매우 낮음 | ❌ 단일 (3 commits 순차) |
| **2.8** | **매우 높음** (independent surfaces) | **활용 예정** |

### Phase 2.8 parallelism 계획 (preliminary)

```
G_A: marketplace (proposals + contracts) — Sonnet
G_B: annotation player (interactive timeline) — Sonnet (peak craft work)
G_C: redesign 풀 (landing + commission + challenges + profile) — Sonnet × 2~3
G_D: project workspace (milestones / messages) — Haiku + Sonnet
G_E: portfolio surface — Haiku
```

5개 독립 worktree 가능. Builder lead.

---

## Section 6 — 핵심 파일 / 위치 reference

| 카테고리 | 위치 |
|---|---|
| Repo root | `C:\Users\yout4\yagi-studio\yagi-workshop` |
| Dev server | port 3003 (`pnpm dev`) |
| Phase 2.7 SPEC v2 | `.yagi-autobuild/phase-2-7/SPEC.md` (511 lines) |
| Phase 2.7 IMPLEMENTATION | `.yagi-autobuild/phase-2-7/IMPLEMENTATION.md` |
| Phase 2.7 FOLLOWUPS (Phase 2.8 deferral list) | `.yagi-autobuild/phase-2-7/FOLLOWUPS.md` |
| Phase 2.7.1 mini-fix prompt | `.yagi-autobuild/phase-2-7/PHASE_2_7_1_MINIFIX.md` (377 lines) |
| Decisions cache | `.yagi-autobuild/DECISIONS_CACHE.md` (Q-001~080+) |
| ADRs | `docs/design/DECISIONS.md` (ADR-008~013 landed in Phase 2.7) |
| Sidebar | `src/components/app/sidebar.tsx`, `sidebar-nav.tsx`, `sidebar-scope-switcher.tsx`, `sidebar-user-menu.tsx` |
| App layout | `src/app/[locale]/app/layout.tsx` |
| Public layout / chrome | `src/components/app/PublicChromeHeader.tsx` (Phase 2.7.1 신규) |
| Language switcher | `src/components/app/language-switcher.tsx` (Phase 2.7.1 신규) |
| Commission flow | `src/app/[locale]/app/commission/*`, `src/app/[locale]/commission/page.tsx` |
| Admin commission queue | `src/app/[locale]/app/admin/commissions/*` |
| Codex config | `C:\Users\yout4\.codex\config.toml` (`model = "gpt-5.5"`) |
| Codex backup | `C:\Users\yout4\.codex\config.toml.5-4-backup` |
| Filesystem MCP allowed dir | `C:\Users\yout4` |

---

## Section 7 — Tone & approach for new chat web Claude

새 chat의 web Claude에게:

- **야기는 비개발자**, 시각/UX 직감 강함, "가시성 떨어진다" 같은 직감 신호 신뢰할 것
- **대화 스타일**: 한국어 + 기술 영어 혼용, 직설적 OK
- **"비판적으로 봐달라"** 자주 요청 — 솔직 평가 우선, 비방 X 비판 O
- **빠른 결정 선호** (옵션 제시 → 야기 1개 선택 → 즉시 실행)
- **"제대로 확인하고 하는 거 맞지?"** = 검증 신호 (공식 docs / repo 실제 파일 / 메모리 재확인)
- **Filesystem MCP 적극 활용** (read/list directly, 야기에게 PowerShell 시키지 말 것)
- **Multi-agent / B-O-E / parallel worktree 인프라 이해 필수** (PARALLEL_WORKTREES.md)
- **Karpathy 모드**: First principles, Boring stack, Schema-first, Failure isolation, No magic
- **MVP 공개 직전** — perfectionism 함정 경계, 사용자 feedback evidence-driven 빌드 우선
- **Antigravity + Gemini 권고**: 현재 도입 보류 (tool fragmentation 비용), Phase 2.8 1페이지 비교 시도는 가능

---

## Section 8 — 새 chat에서 첫 30분 권장 순서

1. **인사 + 핸드오프 인지 확인** (1분)
   - "Phase 2.7.1 SHIPPED 끝났고 visual re-check 안 한 상태야"
   - web Claude가 핸드오프 읽고 컨텍스트 정리

2. **Visual re-check** (15분)
   - 야기 dev server 작동 확인
   - 9 patches 일일이 click-through
   - 발견 issue 모음 (스크린샷 + 한 줄)
   - 즉시 patch (small) vs Phase 2.8 FU (medium/large) 분류

3. **Section 4-2 Tab/Menu 결정 회의** (15-30분)
   - 소통 / 결제 / admin / 새 surface 4개 결정
   - 결정 결과를 Phase 2.7.2 또는 Phase 2.8 prompt로 정리

4. 그 후 야기 컨디션에 따라:
   - Phase 2.8 큰 그림 spec 작성 시작
   - 또는 런칭 자료 / Dana 협업으로 전환
   - 또는 휴식

---

## Section 9 — Pre-action items (새 chat 시작 전 야기가 할 것)

- [ ] dev server 작동 확인 (`pnpm dev` port 3003)
- [ ] 새 chat 열기
- [ ] 위 "⚡ 새 chat 첫 메시지" 블록 복붙
- [ ] 그 다음 메시지에 이 핸드오프 문서 전체 붙여넣기
- [ ] (선택) Section 4-2 답변 미리 생각해두기 — 새 chat 효율 ↑
  - 소통 group 어떻게? (정리 / 통합 / 유지)
  - 결제 group 활용 중? (Phase 1.x 잔재 / 활성 운영)
  - admin surface 통합 vs 분리?
  - 새 surface 필요? (포트폴리오 자리 미리 확보 등)

---

## Section 10 — 잡담 / 메타

- Phase 2.5 → 2.6 → 2.7 v2 → 2.7.1 — 4단계 ULTRA-CHAIN 모두 통과. ADR-005 Gate Autopilot 패턴 검증 완료.
- v1 → v2 course correction (Phase 2.7) 의 학습: Builder가 schema drift 잡는 안전망 잘 작동했음. 야기 + web Claude + Builder + Codex 4-way coordination이 진짜 가치 있음.
- 다음 도전: Phase 2.8 = 진짜 차별점 (annotation player) + premium redesign + 사용자 reaction 데이터 기반 빌드
- **MVP는 시작이지 끝이 아님.** 월요일 공개 후 첫 의뢰 / 첫 sponsor / 첫 사용자 feedback이 진짜 신호.

---

**END OF HANDOFF — 새 chat 행운을 빈다 🌱**
