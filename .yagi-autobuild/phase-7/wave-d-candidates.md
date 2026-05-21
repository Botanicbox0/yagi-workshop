# Wave D Candidates — Phase 7 후속 + Phase 8 진입 결정 보드

> **Created:** 2026-05-22 (Wave C v2 prod smoke 2026-05-21 ship 직후)
> **Purpose:** Wave D scope 결정 + Phase 8+ priority lock (Option A/B/C) 을 위한
> 후보 보드. 후보 item 의 우선순위는 야기 입력 필요.
> **Format:** Phase 6 FOLLOWUPS.md mirror (Trigger / Risk / Action / Owner /
> Status / Registered). 단, 본 doc 은 FU 등록부가 아닌 **후보 보드** — Wave D
> entry 결정 시 official `FOLLOWUPS.md` 로 옮기거나 Wave D SPEC 으로 promote.
> **Sources:** `.yagi-autobuild/phase-7/lessons.md` (L1–L10),
> `.yagi-autobuild/PRODUCT-MASTER.md` §AI + §AJ (v1.10).

---

## TL;DR — 결정 매트릭스 [UPDATED 2026-05-22 after A2]

**L8 / MED-4 invalidation 이후 Polish scope 가 거의 비었음.**

| 시나리오 | Wave D scope | 권장도 |
|---|---|---|
| ~~A. Polish-only (L8 + MED-4 fix)~~ | ~~코드 작업~~ → **무효** (둘 다 false positive / wording-only) | — |
| **B1. QW-3 minimal** (cover image 직접 업로드, minimal version) | R2 signed-URL upload + minimal UI, 1–2h, single PR | △ (Polish 한 마디만이라도 ship 의 의미) |
| **C1. Skip Wave D → Phase 8 entry 직진** | None | ◎ (Polish scope 사실상 없음 + Phase 8 priority lock 이 가장 큰 unblock) |
| B+C. QW-3 ship + 병렬 Phase 8 prep | QW-3 1 PR + Web Claude phase planning 동시 | ○ (cheap parallel) |

**Builder 권장: C1 (Phase 8 직진).**

근거:
- L8/MED-4 invalidation 으로 Polish 의 코드 작업 부분이 사라짐. SPEC wording
  fix (FU-S1) 5분 짜리만 남음.
- QW-3 (cover image) 는 valuable 하나 cover image upload UI 의 destination
  surface (campaign create UI / artist workspace setting / project room) 가
  Phase 8 (Surface-first Option B) 또는 Phase 8 sponsor admin UI (QW-2) 와
  결합되어야 의미 있음. 단독 R2 upload UI 만 ship 하면 destination 없는
  떠다니는 component.
- 가장 큰 unblock = **§AJ Q#1 (Phase 8+ priority Option A/B/C)** lock. yagi +
  Web Claude phase planning chat 에서만 가능.
- 잔여 backlog (L9 audit, QW-1/2/4, FU-S1) 는 Phase 8 Wave A spec 작성 시
  자연 합류.

**최종 결정 = 야기.** §7 (Phase 8 entry checklist) 참조.

---

## §1 — Today's FU (2026-05-21 prod smoke 발견)

### FU-7-D-L8-submit-form-error-toast — **INVALIDATED 2026-05-22 (false positive)**

- **Original trigger (preserved):** `submit-application-action.ts` 가
  `{ ok: false, error: "..." }` 반환 시 `submit-form.tsx` 에서 toast/inline
  error 표시 안 됨이라는 prod smoke 관찰.
- **A2 git blame 결과:** 6개 layer 전부 smoke (`2026-05-21T17:29:26Z`) **이전**
  commit:
  - `submit-form.tsx` ERROR_KEYS / toastError / `result.ok` branch
    (`1185bb8d`, 2026-05-06, **−15d**)
  - `campaigns/layout.tsx` `<Toaster position="top-center" />`
    (`7c31554e`, 2026-05-11, **−10d**)
  - `messages/{ko,en}.json` `error.*` keys (`1185bb8d`, 2026-05-06, **−15d**)
- **Conclusion:** Toast pipeline 완비된 상태로 smoke 진입. 실제 root cause =
  smoke observer (Claude Code Playwright session) 가 Sonner 4s top-center
  toast 를 놓침 — network response-body 만 응시.
- **Action:** **No code change.** lessons.md L8 amend 완료 (2026-05-22),
  memory `server-action-diagnose-via-network.md` 에 step 0 (toast 표시 확인)
  추가 완료. 향후 비슷 증상 시 step 0 먼저 실행.
- **Status:** closed (false positive).

### FU-7-D-L9-cross-table-constraint-audit

- **Trigger:** `workspaces_plan_check` constraint = `('starter','growth','custom')`
  이었으나 caller 코드가 `plan: "free"` 명시 → INSERT 실패 → action returns
  `workspace_create_failed`. K-05 Codex review 는 정적 valid → catch 못함.
  L5 lesson 의 직계 재발.
- **Risk:** **MEDIUM-HIGH (latent).** workspaces / campaigns / campaign_submissions
  / distributions 의 `*_check` constraint 와 모든 `src/**/_actions/**` insert
  caller 사이 mismatch 가 더 있을 가능성. Phase 8 신규 table 도입 시 동일
  패턴 재발 risk.
- **Action:**
  - One-shot script: `information_schema.check_constraints` + `pg_constraint`
    에서 모든 `*_check` enumerate → 각 column 의 allowed values 추출.
  - `src/**/_actions/**/*.ts` 에서 해당 column 명시 INSERT/UPDATE caller grep
    → 값 mismatch flag.
  - Codex K-05 가 이 audit 을 review protocol 에 흡수할 수 있는지 확인
    (`.yagi-autobuild/codex-review-protocol.md` 업데이트 candidate).
- **Owner:** builder (Wave D entry candidate #2, **단 Phase 8 entry 와 묶어
  진행 시 중복 작업 회피**).
- **Status:** candidate (defer-friendly).
- **Effort:** 0.5–1 day (script + Codex 통합 review 포함).
- **Registered:** 2026-05-22 (from lessons.md L9).

### FU-7-D-L10-mail-delivery-ops

- **Trigger:** Wave C v2 smoke 시 `creator-smoke-003@yagiworkshop.xyz` 로 invite
  요청 → Supabase POST /invite 200 + `confirmation_sent_at` 기록 → 실제 Gmail
  inbox/spam/all-folder 에 메일 없음. `yagiworkshop.xyz` Google Workspace
  catch-all 미설정 의심.
  Smoke 통과는 admin `generate_link` API 우회로 달성 ([[smoke-magic-link-bypass]]).
- **Risk:** **MEDIUM (ops, not code).** 실제 creator 는 본인 이메일 사용 →
  delivery 정상일 가능성 높음. 그러나 향후 smoke / 외부 test 시 동일 마찰
  재발. Resend / Supabase default SMTP 의 bounce 로그 access 부재가 더 큰
  blind spot.
- **Action (코드 아님, yagi 작업):**
  - Google Workspace 콘솔에서 `yagiworkshop.xyz` catch-all → `yagi@yagiworkshop.xyz`
    forward 설정, OR `smoke@yagiworkshop.xyz` 전용 alias 생성.
  - Resend dashboard access 확보 → outbound delivery log 확인 habit 형성.
  - `.yagi-autobuild/HANDOFF.md` 에 "smoke email = `smoke@yagiworkshop.xyz`"
    convention 추가.
- **Owner:** **yagi** (코드 아닌 ops).
- **Status:** candidate.
- **Effort:** 30min (Workspace 설정 + Resend login).
- **Registered:** 2026-05-22 (from lessons.md L10).

### FU-7-D-MED-4-magic-link-sent-drift — **INVALIDATED 2026-05-22 (2nd pass false positive)**

- **Original trigger (preserved):** Wave C v2 SPEC MED-4 의
  `campaign_submissions.magic_link_sent` column 부재 → drift 의심.
- **1st pass verify:** Implementation 은 per-request **return flag** —
  drift 가 아닌 wording 문제로 downgrade, FU-S1 (SPEC fix) candidate 등록.
- **2nd pass verify (`_wave_c_v2_spec.md` re-read line 307–338 + grep):**
  SPEC 어디에도 "column" / "schema" 언급 없음. `magic_link_sent` 가 SPEC 에
  등장하는 위치는 JSX result variable + acceptance criteria 뿐. SPEC 과
  implementation 이 100% 일치. 관찰자가 변수명만 보고 "column 인가?" 잘못
  가정했던 것.
- **Conclusion:** SPEC 정상, 코드 정상. drift 도 wording 문제도 없음.
- **Action:** **No edit.** FU-S1 철회.
- **Status:** closed (false positive, 2nd pass).

---

## §2 — Earlier deferred (lessons.md L6 / L7)

### FU-7-D-L6-creator-onboarding-selector

- **Trigger:** Sidebar 에 creator entry 추가했으나 신규 signup onboarding 은
  brand/artist 만 selectable. Creator workspace 는 응모 flow auto-create 에만
  의존. 직접 signup → onboarding flow 진입 시 creator 선택 불가.
- **Risk:** **MEDIUM (product clarity).** "응모 안 하고 그냥 가입한 creator"
  의 first-touch 경로가 명시되지 않음. Phase 8 Creator Hub (Option B Phase 8
  또는 Option A Phase 10) 와 직접 연결.
- **Action:**
  - Decision: (a) onboarding 에 creator selector 추가, OR (b) "응모 flow
    only 가 creator entry" 의도 명문화 + PRODUCT-MASTER §AE 보강.
  - 어느 쪽이든 야기 input 필요. Phase 8 priority (Option A/B/C) 와 결합
    가능성 높음.
- **Owner:** builder + yagi (product decision).
- **Status:** candidate (Phase 8 entry 와 묶어 진행 권장).
- **Effort:** decision 후 1–2h (code) 또는 30min (doc).
- **Registered:** 2026-05-22 (lessons.md L6, 2026-05-21).

### FU-7-D-L7-r2-lifecycle-deferred

- **Trigger:** `tmp/* → published/*` migration 미구현 — R2 lifecycle 정책
  즉시 적용 시 production data loss risk.
- **Risk:** **LOW (defer-safe).** 현 사용량에서 R2 storage 비용 미미. Phase
  8 published/* migration ship 후 lifecycle enable 이 정상 sequencing.
- **Action:** Phase 8 published-asset spec 작성 시 함께 진행. 본 Wave D 에서
  는 **defer 권장**.
- **Owner:** builder (Phase 8).
- **Status:** **defer to Phase 8.**
- **Effort:** N/A (Phase 8 scope).
- **Registered:** 2026-05-22 (lessons.md L7).

---

## §3 — Phase 8+ priority decision (PRODUCT-MASTER §AI)

PRODUCT-MASTER v1.10 §AI 의 3가지 option (verbatim):

```
Option A — Twin-first (high impact, high complexity):
  Phase 8 = Digital Twin core (registry + adoption + per-use approval)
  Phase 9 = Curated Project + Project room 확장
  Phase 10 = Creator Hub

Option B — Surface-first (low risk, incremental):
  Phase 8 = Curated Project + Creator Hub
  Phase 9 = Digital Twin core
  Phase 10 = Twin + Curated 통합

Option C — Demand-driven:
  첫 celebrity client 영입 → 그 필요 따라 twin or curated 우선
  첫 brand client 영입 → commission flow refinement 우선
```

**Wave C v2 ship 후 남은 critical gap (§AI):**

1. ❌ Digital Twin mechanism 전체 (Celebrity workspace 핵심)
2. ❌ Celebrity workspace UI (identity registry)
3. ❌ Brand workspace twin opt-in UI
4. ❌ Twin asset storage + access control + permission flow
5. ❌ Curated Project (selected invite path)
6. ❌ Brand ↔ Celebrity twin adoption matching
7. ❌ 외부 협업자 invite system (project-scoped guest role)

**Builder 관점 trade-off summary:**

| Option | 장점 | 단점 |
|---|---|---|
| **A (Twin-first)** | Vision 의 가장 큰 차별점 (Identity Extension) 을 가장 먼저 실증. Digital Human IP Studio axis 와 직접 정합. | 복잡도 가장 큼 (asset storage, access control, per-use approval flow). 첫 celebrity client 영입 전 over-engineering risk. |
| **B (Surface-first)** | Curated + Creator Hub 가 비교적 boring (기존 Distributed Campaign 의 sibling). Risk 낮음. | Twin = vision 의 가장 비싼 약속인데 가장 늦게 ship → "Identity Extension Studio" claim 의 evidence 지연. |
| **C (Demand-driven)** | 영업 결과 따라 sizing → over-build 회피. | Phase planning 자체가 conditional → spec stability 저하. 야기 / Builder 가 항시 "어느 시나리오를 가정하는가" 명시 필요. |

**Builder 권장:** 본 결정은 **product/biz decision** — builder 단독 판단 영역
아님. **Web Claude phase planning chat 으로 이동** 권장 (full 4-actor business
context + 첫 client 영입 가능성 input 필요).

---

## §4 — Open product questions (§AJ, 야기 결정 대기)

PRODUCT-MASTER v1.10 §AJ verbatim:

1. **Phase 8+ priority** (Option A/B/C 중 선택) — §3 참조.
2. **Digital Twin 소유권 모델** — celebrity 고정 vs license 구조.
3. **Twin per-use approval vs blanket license** — 매 사용 승인 vs 사전 위임.
4. **Twin training operator** — yagi internal vs creator outsource.
5. **Revenue share 구조** — brand → yagi → celebrity, brand → yagi → creator.
6. **UI naming** — "Celebrity" vs "Artist" vs "연예인" (현 코드 = `artist`,
   PRODUCT-MASTER §AE 는 "Celebrity" 채택, 워딩 rule lock 필요 — yagi-wording-rules
   skill 의 Phase 6 entry lock 시점 = 2026-05-05 이므로 이미 lock 됨).
7. **외부 협업자 role schema** (`workspace_members.role = 'guest'` 도입 여부).

**Builder 관점:** 본 7개 중 #1 만 Phase 8 entry 의 prerequisite. #2–#7 은
Phase 8 Wave A spec 작성 시 정해도 OK.

### Q#6 resolution (2026-05-22, yagi input 불필요 — PRODUCT-MASTER 자체 답)

**결정:** **Wave D 시점 = "Artist / 아티스트" 유지.** Phase 8 Digital Twin
ship 시점에 "Celebrity" / "연예인" 으로 rename 재검토.

근거:
- PRODUCT-MASTER §AE (line 708) actor mapping table: **"CELEBRITY (셀러브리티)
  | `artist` (v1.10 기준)"** — Celebrity actor 의 schema kind = `artist`,
  v1.10 lock.
- §AE line 715: "v1.10 기준에서 'Celebrity' actor = schema 의 `artist` kind
  와 **동일**".
- §AE line 718: "Phase 8+ Digital Twin ship 시 UI naming 은 'Celebrity' 또는
  '연예인' 으로 재정렬 **고려**" — 이미 Phase 8 deferred 명시.
- yagi-wording-rules skill 제품 surface 표: **"Artist / 아티스트 — K-pop
  산업 표준, 한국어 그대로 OK"** + **"Digital Twin / Twin — 4/30 결정, brand
  워딩과 동일"**.
- §Y line 241 (Q2 워딩): "**'캠페인'**" Phase 9 까지 유지.

**Wave D / L8 implementation rule:**
- UI / i18n key value / component label: **"Artist / 아티스트"** 사용 (현재
  코드와 동일, 변경 불필요).
- DB / TS type / server action / 코드 주석: `artist` (현재 코드와 동일).
- Vision text (외부 소개 / about page / marketing copy): "Celebrity /
  셀러브리티" OK (§AE 의 4-actor framing 그대로).

**Phase 8 entry 시 별도 결정:**
- Twin registry / Twin opt-in UI 의 actor noun: "Celebrity" or "연예인" 으로
  rename 할지 — PRODUCT-MASTER v1.11+ amendment.

---

## §5 — Prior session quick wins (직전 Web Claude handoff §B 원본)

직전 session handoff §B 에서 명시된 4개 quick win. Wave D 후보 또는 Phase 8
defer 후보 분류 대상.

### QW-1 — Onboarding signup → creator workspace selector

- **Trigger:** L6 의 직접 해결안. 신규 signup 의 onboarding flow 에 creator
  selector 추가 → "응모 안 하고 가입한 creator" 의 first-touch 경로 명시.
- **Risk:** **MEDIUM (product clarity).** L6 와 동일 — Phase 8 Creator Hub
  와 연결.
- **Action:** `/[locale]/onboarding/` 의 brand/artist selector 에 creator
  option 추가, creator workspace auto-create (응모 flow 와 동일 logic 재사용).
- **Owner:** builder + yagi (Creator Hub vision 정합 확인).
- **Status:** candidate (Phase 8 entry 와 묶어 진행 권장 — L6 와 중복).
- **Effort:** 2–4h.

### QW-2 — Sponsor admin UI (campaign create/approve/review)

- **Trigger:** 현재 야기가 campaign create/approve/review 를 SQL 직접 사용 중.
  Brand workspace UI 미구현으로 ops 부담.
- **Risk:** **HIGH (ops bottleneck).** 첫 brand client 영입 시 SQL operator
  부재 → 즉시 blocker. Phase 8+ Option B (Surface-first) 의 핵심 구성 요소.
- **Action:** `/[locale]/admin/campaigns/*` 또는 `/[locale]/app/brand/*` 에
  campaign CRUD + approval queue UI. Existing yagi_admin role + 신규 brand
  role 분리 필요.
- **Owner:** builder (Phase 8 entry candidate, **NOT Wave D Polish scope**).
- **Status:** candidate (Phase 8 priority lock 후 promote).
- **Effort:** 1–2 weeks (Wave 1개 분량).

### QW-3 — Cover image 직접 업로드

- **Trigger:** 이전 야기 요청. 현재 campaign / project cover image 가 URL
  paste 방식 (or 미구현) — R2 upload UI 부재.
- **Risk:** **LOW–MEDIUM (UX).** Operator (yagi) 본인은 R2 직접 업로드 가능
  하나 brand/celebrity self-serve flow 의 prerequisite.
- **Action:** R2 signed-URL upload + crop UI (Phase 2.5 G6 avatar crop 의
  pattern 재사용 가능). `tmp/* → published/*` migration (L7) 과 sequencing
  주의 — 본격 published namespace 도입 전 임시로 `tmp/covers/*` 운영 가능.
- **Owner:** builder.
- **Status:** candidate (Wave D Polish scope 진입 가능 — 1-2h 의 minimal
  version 부터 단계적).
- **Effort:** Minimal 2–3h / Full (crop+lifecycle) 1 day.

### QW-4 — Status stepper

- **Trigger:** 이전 야기 요청. campaign / submission / project 의 status
  진행 상황을 visualize 하는 stepper component 부재.
- **Risk:** **LOW (UX clarity).** 사용자 (creator / brand) 가 "지금 어느
  단계인지" 명시 안 됨 → 불안 + ops 문의 증가 risk.
- **Action:** Shadcn-ui pattern 으로 stepper component 신규 작성
  (`src/components/ui/status-stepper.tsx`), submission detail / campaign
  detail / project room 등 multiple surface 에서 재사용.
- **Owner:** builder.
- **Status:** candidate (Wave D Polish scope 진입 가능 — visual change
  포함이므로 K-06 review 필요).
- **Effort:** 4–6h (component + 3개 surface 적용).

**QW 종합 권장:**
- **Wave D Polish 에 합류 가능:** QW-3 (minimal version) 만 — 1-2h 추가.
- **Phase 8 promote:** QW-1 (L6 와 중복) / QW-2 (Surface-first 의 핵심,
  §Y line 246 의 "Q8 Roster funnel UI Phase 8 deferred" 와 직접 연결) /
  QW-4 (visual review 필요, Polish PR 단일성 깨짐).
- **단, 본 Wave D 의 정의가 "logic only, no visual change" 라면 QW-3 도
  defer.** L8 fix + MED-4 verify 단일성 유지 권장 (현 결정: **Wave D =
  Polish-only**, K-06 skip 가능).

---

## §6 — yagi-wording-rules skill ↔ PRODUCT-MASTER drift (2026-05-22 발견)

### Finding

`yagi-wording-rules` skill 본문 첫 줄: *"이 skill 은 PRODUCT-MASTER §M 의
**mirror**. Source-of-truth = `.yagi-autobuild/PRODUCT-MASTER.md` §M."*

그러나 PRODUCT-MASTER.md 에 `§M` heading 부재 — `grep "§M"` → 0 hit.

### 가능성

1. PRODUCT-MASTER 어느 버전에서 §M section 이 누락되거나 다른 § 로 흡수됨.
   현 v1.10 까지 §A–§J / §Y / §AC–§AJ 등 존재하나 §K–§X / §Z–§AB / §M 라벨
   조회 안 됨.
2. Skill 이 가리키는 §M = 별도 doc (`.yagi-autobuild/wording-rules.md` 등)
   인데 잘못 PRODUCT-MASTER §M 으로 표기.
3. §M 이 archive 또는 transient 위치로 이동됨.

### Risk

**MEDIUM (governance).** Skill 이 가리키는 lock 위치가 실재 부재 → 워딩 룰
의 source-of-truth 자체가 모호. 차후 워딩 amendment 시 어디 update 할지
혼란. 그러나 skill 본문 자체에 §M 의 verbatim mirror 가 들어가 있어 일상
사용은 무해.

### Action

- **Wave D scope 아님.** 본 Phase 7 closing 작업 또는 Phase 8 entry 시점에
  별도 처리.
- 옵션 (a): PRODUCT-MASTER 에 §M section 신설 → skill 본문 그대로 paste +
  v1.11 amendment lock.
- 옵션 (b): skill 본문의 source-of-truth 위치 수정 (예:
  `.yagi-autobuild/wording-rules.md` 신설 또는 skill 자체를 source 로 격상).
- 옵션 (c): PRODUCT-MASTER 의 기존 워딩 관련 § (§AE 일부, §Y Q2 워딩 등)
  를 통합해 §M 으로 정리.

**Owner:** yagi + builder (governance decision).

### Wave D 진행 영향

**없음.** L8 fix 의 i18n key value 는 skill 본문의 verbatim mirror 만 보고
판단 가능. §M section 실재 부재는 별도 follow-up.

---

## §7 — Phase 8 entry checklist (C1 채택 시)

C1 (Phase 8 직진) 채택 시 다음 순서:

1. **§AJ Q#1 lock — Web Claude phase planning chat 진입.** Option A
   (Twin-first) / B (Surface-first) / C (Demand-driven) 중 야기 결정.
   - Input 필요: 첫 celebrity client 영입 가능성, 첫 brand client 가능성, Digital
     Human IP Studio axis 와의 sequencing 의향.
   - Builder 단독 불가 — biz / 영업 context 필요.
2. **Phase 8 KICKOFF.md draft** — Option 결정 후 `.yagi-autobuild/phase-8/`
   directory 생성, `spec-template.md` 기반 KICKOFF draft.
3. **잔여 Wave C v2 closing** — FU-S1 도 2nd pass false positive 로
   invalidated. **추가 SPEC fix 없음.** 본 amend batch (lessons.md +
   wave-d-candidates.md + memory updates) commit 만 진행.
4. **Phase 8 Wave A spec 작성 시 흡수 candidate** — 본 doc 의 다음 item 들
   재검토:
   - L9 cross-table constraint audit (FU-7-D-L9) — Phase 8 신규 table 도입
     직전 1회 실행.
   - QW-1 creator onboarding selector — L6 와 통합.
   - QW-2 sponsor admin UI — Option B 채택 시 Phase 8 핵심 work.
   - QW-3 cover image upload — destination surface 정해진 후 진입.
   - QW-4 status stepper — Phase 8 새 surface 들과 함께.
   - §AJ Q#2–7 — Phase 8 Wave A spec 작성 시 결정 가능.

## §8 — Yagi 영역 작업 (병렬 가능)

코드 작업 아닌 yagi 본인 영역 (Phase 8 KICKOFF 진입과 무관하게 진행 가능):

1. **L10 mail ops** — Google Workspace `yagiworkshop.xyz` catch-all 설정 OR
   `smoke@yagiworkshop.xyz` alias 생성. Resend dashboard access 확보.
2. **§AJ Q#6 (UI naming)** — Phase 8 Digital Twin ship 시점에 재검토하기로
   §4 Q#6 resolution 에서 이미 결정. Wave D action 불필요.

---

## Next action (야기 결정 대기)

1. **Wave D scope 최종 결정** — TL;DR 매트릭스에서 B1 / C1 / B+C 중 pick.
   - **C1 권장 (Phase 8 직진).** L8/MED-4 invalidation 이후 Polish scope 거의
     없음.
2. **§AJ Q#1 (Phase 8+ priority)** — Web Claude phase planning chat 으로
   이동, Option A/B/C lock.
3. **(C1 채택 시)** §7 entry checklist 의 1–2번 step 진행.

본 doc 은 야기 결정 후 다음과 같이 분해:
- C1 채택 시: 본 doc 을 `.yagi-autobuild/phase-8-pre/CANDIDATES.md` 로 rename
  + Phase 8 KICKOFF 작성 시 §7 checklist 의 흡수 candidate 들 review.
- B1 채택 시: 본 doc 의 QW-3 부분만 Wave D SPEC 으로 promote, 나머지는
  Phase 8-pre 로 이관.
- §AJ open question 결정사항 → PRODUCT-MASTER v1.11 amendment.
