# Phase 2.7 — Morning Handoff (야기용)

**작성 시점:** 2026-04-24 late night (야기 취침 전)
**작성자:** web Claude (Option 3 공격적 모드 승인받아 혼자 설계)

---

## 🌅 일어나서 읽을 순서

**이 파일만 3분 읽고 아래 Action 진행하면 됨.**

---

## 🎯 핵심 변경: Business Model Pivot

Phase 2.7은 **단순 polish가 아니라 비즈니스 모델 전환**입니다.

### Before (Phase 2.5/2.6 implicit)
- 챌린지 커뮤니티 + 크리에이터 쇼케이스 플랫폼

### After (Phase 2.7 설계)
- **AI VFX 의뢰 마켓 (primary revenue) + 챌린지 포트폴리오 쇼케이스 (secondary)**
- **Target: 엔터 레이블 (JYP, YG, 하이브 등), 광고 에이전시, 독립 아티스트**
- **수익 모델: 중개 수수료 15-20% + 챌린지 후원 + YAGI Direct**

야기가 말한 "대기업/아티스트가 와서 의뢰 많이 할거임"을 **최우선 비즈니스 축**으로 해석. 챌린지는 유지하되 **크리에이터 발굴/포트폴리오 surface**로 재위치.

---

## 📂 작성된 문서 (전부 `.yagi-autobuild/phase-2-7/`)

| 파일 | 크기 | 역할 |
|---|---|---|
| `SPEC.md` | 542 lines | Why + What (policy, business, persona, journey, design language) |
| `IMPLEMENTATION.md` | ~850 lines | How (schema SQL, RLS, routes, gate tasks, parallel teammates) |
| `REFERENCES.md` | 117 lines | ADR links, cross-phase deps, terminology |
| `FOLLOWUPS.md` | 145 lines | Deferred items (15 FUs, Phase 2.8+ 예약) |
| `KICKOFF_PROMPT.md` | 179 lines | **Builder에 붙여넣을 최종 프롬프트** |

추가 업데이트:
- `DECISIONS_CACHE.md` Q-046~080 append (35 decisions pre-answered)

---

## 🔧 아침 Pre-flight Actions (15분)

### 1. 문서 read-through (10분)

**필수:** `SPEC.md` §0 (Why) + §1 (Personas) + §7 (Gate plan) 훑기. 큰 그림 맞는지 확인.

특히 검토할 것:
- "대기업/아티스트 의뢰" 해석 맞는지 → `§0 Why` 
- Client/Creator/Admin 3-persona 구조 OK인지 → `§1`
- 9 gates (G1-G9) scope OK인지 → `§7`

**야기 피드백 있으면 지금 Builder 투입 전에 SPEC 수정.** Builder 투입 후에는 drift 이슈 커짐.

### 2. R2 bucket 생성 (3분)

Cloudflare dashboard 열고:
- R2 → "Create bucket"
- Name: `yagi-project-files`
- Location: ENAM (Eastern North America) — Phase 2.5 `yagi-challenge-submissions`와 동일
- Public access: OFF
- CORS:
  ```json
  [{
    "AllowedOrigins": ["http://localhost:3003", "https://yagiworkshop.xyz"],
    "AllowedMethods": ["GET","PUT","POST","HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
  ```
- Lifecycle: `tmp/` prefix 24h expire

### 3. `.env.local` 추가 (1분)

```
CLOUDFLARE_R2_PROJECT_BUCKET=yagi-project-files
```

(나머지 R2 credentials는 Phase 2.5와 공유 — 별도 추가 불필요)

### 4. Font 선택 확정 (1분)

**권장: Playfair Display (Google Fonts 무료)** — DECISIONS_CACHE Q-060 기본.

만약 Migra 구매 결정 시: https://pangrampangram.com/products/migra — $149-199 lifetime commercial license. 구매 후 `public/fonts/migra/Migra-Extrabold.woff2` 배치 + `globals.css` @font-face 수정.

**아침에 굳이 지금 결정 안 해도 됨. G8 entry 시 Builder가 Playfair Display 기본 적용, 원할 때 Migra 교체.**

---

## 🚀 Builder 투입 (2분)

**Main worktree에서 `claude` 실행** (Phase 2.6처럼 worktree 쓰지 말고 main에서 직접):

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
git checkout main
git pull origin main
claude
```

Builder 창 열리면 **`.yagi-autobuild/phase-2-7/KICKOFF_PROMPT.md` 의 `## Context for Builder` 섹션 이후 전체를 복사해서 붙여넣기.**

섹션 시작점 찾기: `Phase 2.7 Commission Platform + Premium Redesign kickoff — ULTRA-CHAIN MODE.` 부터 끝까지.

---

## ⚠️ 중요한 것 — 예상 timeline

| 시점 | 작업 | 
|---|---|
| 토요일 아침 (6-10시) | SPEC review + R2 setup + Builder 투입 |
| 토요일 낮-저녁 | **G1-G5** 자동 진행 (Schema + Client signup + Brief + Discover + Contract) — 20-25h 작업 Ultra-chain으로 가속 |
| 토요일 밤 | **G6-G7** (Milestones + Portfolio) |
| 일요일 오전 | **G8** peak parallelism (디자인 pass, 4 teammates 동시) |
| 일요일 오후 | **G9** Codex K-05 + hardening |
| 일요일 저녁 | Phase 2.7 SHIPPED 기대 |
| 일요일 밤 | MVP polish final sweep + SNS 자료 준비 |
| 월요일 새벽 | 🚀 **MVP 공개** |

**Tight. Phase 2.5+2.6 기준 per-phase 10-14h인데 Phase 2.7은 9 gates (~33-46h). 2배 이상.**

### 리스크

- G8 디자인 pass가 예측 어려운 시간 소요 가능 (6-8h 추정이지만 polish 주관적)
- Codex K-05가 commission/contract 같은 돈 흐름 있는 surface에서 HIGH-A 많이 잡을 가능성 (Phase 2.5보다 hardening loop 깊을 수도)
- Font/motion library 선택 중 Builder가 halt 요청 가능

### Fallback plan

만약 일요일 밤까지 Phase 2.7 SHIPPED 못 하면:
- **Plan B**: Phase 2.7 G1-G5 완료분만 main에 merge + 나머지 G6-G9는 월요일-화요일 마감 → **월요일 soft launch (챌린지 + Phase 2.7 부분 기능)**, 화요일 공식 announce
- **Plan C**: Phase 2.7 전체 brancheh에 유지, Phase 2.5+2.6만 main에서 월요일 공개 → Phase 2.7은 별도 런칭

Builder가 G5 closeout 시점에 timeline 보고 Plan A/B/C 중 명시적 선택 alert 보낼 것.

---

## 🎨 Webflow 디자인 야기 취향 반영

야기가 "웹플로우 스타일 참고"라고 했는데, SPEC §5에 구체화했음:
- Apple.com + Linear.app + A24.com 결합 톤
- Monochrome + Webflow blue (기존) + warm accent 1개
- 대형 타이포 (display 최대 128px)
- Cinematic motion (Framer Motion, scroll-driven)
- Editorial photography (Unsplash cinematic samples 활용, Dana 후속 큐레이션)
- Serif display 가능성 (Playfair Display 기본, Migra upgrade 옵션)

**기존 `yagi-design-system` skill + `frontend-design` skill 통합 활용.** G8에서 Builder가 skill 로드 후 품질 bar 높여 작업.

---

## 🤔 아직 불확실한 것 (야기 확인 포인트)

1. **"챌린지 유지"** 확인 — Phase 2.7은 챌린지를 **유지하되 secondary로 재위치**. 완전 제거 아님. 이 해석 OK?
2. **중개 수수료 15-20%** default — 업계 통상치. 조정 원하면 Q-056 수정.
3. **Client 회사 verification** manual — 대량 가짜 client 걱정되면 Q-047 방식 재검토.
4. **Migra 구매 vs Playfair Display 무료** — MVP는 무료로 진행 권장. 불만족이면 G8 도중 교체.

이 중 이슈 있으면 SPEC 수정 후 Builder 투입. 이슈 없으면 그대로 진행.

---

## 📞 Builder 돌아가는 동안 야기가 할 것

1. **Dana와 mini-meeting** (선택) — 이 pivot을 Dana도 알아야 함. Phase 2.7 SPEC 3줄 요약 공유:
   > "우리 플랫폼 비즈니스 모델을 챌린지 중심에서 AI VFX 의뢰 마켓 중심으로 재편했어. 챌린지는 유지하되 크리에이터 포트폴리오 surface로 역할 바꾸는 거. 대기업/아티스트 B2B 직접 타겟. 다음 48시간 동안 Builder가 구현. 월요일 런칭 목표."

2. **런칭용 자료 준비** (Phase 2.7 진행 중 병렬로 가능):
   - 타겟 리스트: JYP/YG/하이브/SM/스타쉽/큐브 + 광고 에이전시 3-5곳 담당자 연락처 (있으면)
   - 런칭 멘트 초안 (SNS/Instagram Story용)
   - Dana가 curate 가능한 cinematic reference 이미지 (Phase 2.7 G8-B commission sales page 용)

3. **휴식** 🌱 — 지난 48시간 동안 엄청 달렸음. Phase 2.7은 Ultra-chain이 돌려줄 테니 중간 체크만.

---

## 🆘 Emergency contacts (야기 반응 필요한 상황)

Telegram에서 다음 단어 보이면 즉시 확인:
- `halt` / `HALT`
- `HIGH-A`
- `permission` / `approve` / `승인`
- `schema conflict`
- `Codex budget exhausted`
- `loop 3`

그 외 `Gate N SHIPPED` 알림은 흘러가도록 두면 됨.

---

## 📝 GPT 5.5 / Codex 영향

**영향 없음.** `~/.codex/config.toml`의 `model = gpt-5.4` 고정. Codex plugin 독립 업데이트. Phase 2.5+2.6에서 5.4로 3-loop 성공 실적. **지금 업그레이드 금지** (변수 최소화).

---

## ✅ 자기 전 체크리스트

이 문서 내용 기반 action items:

- [x] Phase 2.7 SPEC v1 authored (web Claude, 542 lines)
- [x] Phase 2.7 IMPLEMENTATION v1 authored (850 lines)
- [x] Phase 2.7 REFERENCES v1 authored (117 lines)
- [x] Phase 2.7 FOLLOWUPS v1 authored (145 lines)
- [x] Phase 2.7 KICKOFF_PROMPT authored (Builder-ready, 179 lines)
- [x] DECISIONS_CACHE Q-046~080 appended (35 decisions)
- [x] Morning HANDOFF note authored (this file)
- [ ] 야기 morning: SPEC read-through
- [ ] 야기 morning: R2 bucket 생성
- [ ] 야기 morning: .env.local 업데이트
- [ ] 야기 morning: Builder 투입 (KICKOFF_PROMPT 붙여넣기)

---

**정말 주무세요. Phase 2.7은 클 작업이지만, Phase 2.5/2.6 인프라 위에 얹는 거라 속도 낼 수 있음.**

내일 아침 이 문서 다시 읽고 바로 시작하세요.

🌙 Good night, 야기.
— web Claude

---

*P.S. 뭐든 수정 필요하면 Builder 투입 전에 말씀. SPEC drift가 가장 비쌈. Drift 전에 수정 > Drift 후 수정.*
