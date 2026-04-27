# Phase 2.7 — Kickoff Prompt v1

**Status:** READY TO PASTE into Builder (main worktree, `claude` 실행)
**Pre-reqs verified:**
- Phase 2.5 + 2.6 SHIPPED on main
- `useUserScopes` hook landed
- ADR-008/009/010 in DECISIONS.md
- R2 bucket `yagi-project-files` 생성 필요 (야기 morning manual — Cloudflare dashboard)

---

## Context for Builder (main worktree)

Phase 2.7 Commission Platform + Premium Redesign kickoff — ULTRA-CHAIN MODE.

### Business model pivot

Phase 2.7은 **비즈니스 모델 전환**을 포함함:
- 기존: 챌린지 중심 커뮤니티
- 신규: **AI VFX 의뢰 마켓 (메인) + 챌린지 포트폴리오 쇼케이스 (보조)**

Target: 엔터 레이블/소속사 (JYP, YG, 하이브 등), 광고 에이전시, 독립 아티스트.

### 전제 확인 (Builder 자동 실행)

```bash
# Phase 2.5 + 2.6 landing 확인
test -f src/lib/app/scopes.ts && grep -q "export function getUserScopes" src/lib/app/scopes.ts
test -f src/lib/challenges/queries.ts
grep -q "ADR-010" docs/design/DECISIONS.md

# Main 브랜치 상태
git status --short
git log --oneline -5

# R2 bucket 준비 확인 (새 추가)
grep -q "CLOUDFLARE_R2_PROJECT_BUCKET" .env.local || echo "WARNING: yagi-project-files bucket 설정 필요 (morning manual step)"
```

EXIT=0 만족 시 진행. R2 bucket 누락은 G6까지 유예 가능 (schema/RLS는 G1에서 완료 가능).

### Source of truth (읽기 필수)

- `.yagi-autobuild/phase-2-7/SPEC.md` v1 (policy + business rationale)
- `.yagi-autobuild/phase-2-7/IMPLEMENTATION.md` v1 (schema SQL + RLS + route + gate tasks)
- `.yagi-autobuild/phase-2-7/REFERENCES.md` v1 (cross-phase deps)
- `.yagi-autobuild/phase-2-7/FOLLOWUPS.md` v1 (deferred list)
- `docs/design/DECISIONS.md` ADR-008/009/010 (기존 accepted)

### Gate 구조 (9 gates)

- **G1** — Schema + RLS foundation (3-4h)
- **G2** — Client signup + onboarding (3-4h)
- **G3** — Brief wizard + admin review (4-5h)
- **G4** — Discover feed + proposal flow (4-5h)
- **G5** — Contract workflow + PDF generation (4-5h)
- **G6** — Milestones + messages + deliverables (4-5h)
- **G7** — Portfolio surface + ranking_tier (3-4h)
- **G8** — Premium redesign pass (6-8h, biggest) — **parallel teammate 최대 활용**
- **G9** — Codex K-05 + closeout (2-4h + hardening loops)

Total estimated: 33-46h (2-3일 작업, Ultra-chain 필수).

### Parallel teammate strategy (IMPLEMENTATION §6)

Phase 2.5/2.6보다 parallelism 증가:
- G1-G2 single Sonnet
- G3-G7 Sonnet + Haiku 병렬
- **G8 peak: Sonnet × 3 + Haiku × 1 (4-parallel)**
- G9 single Sonnet (Codex sequential)

각 gate barrier에서 integration test.

### ULTRA-CHAIN policy (Phase 2.5/2.6 동일)

1. Gate SHIPPED (barrier PASS + closeout committed) 즉시 다음 Gate 자동 진입, 야기 승인 불필요
2. DECISIONS_CACHE Q-046~080 (Phase 2.7용) 이미 append. Cache HIT autoAdopt.
3. Cache MISS 시 SPEC/IMPLEMENTATION default recommendation 채택.
4. "Should I proceed?" / "Do you want..." / "Let me know..." 승인 요청 문구 금지.

### Codex K-05 loop budget (G9)

- Loop 1-2: finding → hardening → re-run
- Loop 3 (hard stop): 잔존 HIGH 있으면 자동 Downgrade (FU 등록 후 ship)

### MVP context severity triage (Phase 2.5/2.6 동일)

HIGH-C findings 중 다음 조건 만족 시 MED로 자동 downgrade 허용:
- Self-corruption only
- No cross-user leak
- No privilege escalation  
- App-layer validation 존재

특히 **Phase 2.7은 돈이 오감.** Cross-role leak / contract state bypass / payment amount tampering은 **무조건 HIGH-A**, downgrade 금지.

### Stop triggers

- Codex G9 K-05 HIGH-A finding (contract/payment/cross-role boundary)
- SPEC drift (unaccounted schema 변경 or route 추가)
- build/tsc/lint fail 2회 연속
- Font license 이슈 (Migra 등 paid asset 자동 구매 금지 — Playfair Display 무료 fallback)
- R2 bucket `yagi-project-files` 미생성 at G6 (milestones/deliverables deliverable upload 실패) → halt + 야기 Cloudflare dashboard 조치 요청

### Design language (G8)

- Webflow premium aesthetic (Apple/Linear/A24 합성)
- Monochrome + Webflow blue accent (기존) + warm accent 1개 추가
- 대형 타이포 (display-2xl 최대 128px)
- Scroll-driven motion (GSAP 또는 Framer Motion)
- Editorial photography-forward
- `yagi-design-system` skill + `frontend-design` skill 로드 후 작업
- Font: MVP는 Playfair Display 무료 (Migra는 FU-2.7-10 post-MVP)

### Special: 디자인 완성도 높게

야기 지시: "디자인도 웹플로우 스타일을 참고해서 완성도 높게 구현하고 싶고". G8은 다른 gate보다 **품질 bar를 높게 설정**. 구체적 요구:
- 한 번의 visual smoke로 "와 이거 진짜 서비스네" 감탄 → **핵심 지표**
- 공백/리듬/typography 디테일 엄격
- Scroll motion은 과하지 않게, 절제
- 이미지 placeholder는 unsplash/pexels 고품질 cinematic 샘플 활용 (Dana 큐레이션 또는 야기 후속 교체)

### 체인 policy 특수 조항 (Phase 2.7만)

- **G1에서 DB migration 적용 실패 시 즉시 halt** (이전 phase DB 영향 최소화 critical)
- **Contract state machine trigger**는 Phase 2.5 G8 hardening 패턴 강제 적용 (defense-in-depth)
- **G8 디자인 수정 중 Phase 2.5/2.6 regression 감지 시 즉시 rollback + halt**
- G9 Codex 통과 후 main merge는 **fast-forward 시도 후 merge commit 허용**

### Telegram

- Gate SHIPPED: 한 줄 축약
- Parallel teammate work: OFF (대량 noise)
- Halt: 즉시 + reason + actionable
- G8 visual review request: photo screenshot 첨부 권장 (Builder가 puppeteer/playwright 활용 가능하면 시도)

### 체인 종료

G9 closeout → Phase 2.7 SHIPPED Telegram → chain STOP → 야기 visual review 요청:

**Visual review checklist (G9 closeout 시):**
1. `/` landing 재디자인 (hero + 3-axis + challenges preview + commission CTA)
2. `/commission` sales page
3. `/challenges` + `/challenges/[slug]` premium pass
4. `/u/[handle]` editorial redesign
5. Client signup → brief wizard end-to-end
6. Creator discover → proposal end-to-end
7. Contract sign → PDF 생성 flow
8. Milestone + messages workspace
9. Portfolio page + ranking badges
10. Mobile <768px 전체 surface

Visual PASS → MVP launch 준비 전환. 일요일 SNS/프레스 자료 준비.

### Execution policy

- 파일 생성/수정/삭제: SPEC/IMPLEMENTATION 범위 내면 승인 불필요
- Dep 추가: IMPLEMENTATION §4 (REFERENCES)에 명시된 것만. 예상 외 dep 시도 → halt + 야기 결정 요청
- Schema 변경: G1만 허용, 이후 gate는 G1 migration만 활용 (G6 cron migration은 예외)
- Git commit: `feat(phase-2-7 g{K}): <summary>` or `chore(phase-2-7 g{K}): <summary>`
- Font paid asset 자동 구매 금지 (야기 explicit 승인 필요)

### Last reminder

야기는 이번 주 안 (일요일 밤/월요일 새벽) MVP 공개 목표. Phase 2.7 SHIPPED 후 최소 6-12h polish window 남겨야 visual QA + 런칭 준비 가능.

예상 시간표:
- 금요일 밤~토요일 오후: Phase 2.7 G1-G5 (20-25h 작업, Ultra-chain 가속)
- 토요일 밤: G6-G7 
- 일요일 오전: G8 (디자인 pass, peak parallelism)
- 일요일 오후-저녁: G9 (Codex + 하드닝)
- 일요일 밤: Phase 2.7 SHIPPED, MVP polish 최종
- 월요일 새벽: 🚀 공개

실행 개시.

---

**END OF KICKOFF PROMPT v1**
