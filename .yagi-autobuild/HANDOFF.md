# YAGI Workshop — Handoff (최종)

> **갱신:** 2026-04-22 (Phase 1.9 완주 + ops 복구 완료)
> **목적:** Phase 1 전체 시리즈 shipped. 운영 블로커 해제. Phase 2.0 계획 단계 진입 가능.

---

## 🎉 상태: Phase 1 완주

### Phase 진행 (100%)
- ✅ Phase 1.0 / 1.0.6 / 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4 / 1.5 / 1.6 / 1.7 / 1.8 / 1.9 전부 완료
- ✅ Autopilot 체인 실행 (Phase 1.2 → 1.9 자동 연쇄, Codex gpt-5.4 high reasoning 리뷰 통과)
- ✅ Phase 1.8 운영 세팅 완료 (notify-dispatch Edge Function + cron 10분 간격 + secrets + Vault)
- ✅ Popbill 승인 완료, POPBILL_MODE=test 로 전환됨


---

## 🔑 환경 정보

### Supabase 프로젝트 (⚠️ 중요)
- **정답 프로젝트: `yagi-workshop` (jvamvbpxnztynsccvcmr, ap-southeast-1)**
  - Next.js 앱이 붙는 DB
  - Phase 1.0~1.9 마이그레이션 23건 전부 적용됨
  - notify-dispatch Edge Function 배포됨
  - Cron 10분 간격 active
- **주의 — 혼동 프로젝트:**
  - `YAGI STUDIO` (vvsyqcbplxjiqomxrrew, ap-northeast-1) — 레거시 공개 마켓플레이스, 현재 미사용
  - `openclaw yagi` (ap-south-1) — 현재 paused

### 다중 프로젝트 운영 규칙
Supabase CLI / SQL Editor 작업 시작 전 항상 확인:
1. `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL` 값
2. 스크립트의 `$projectRef` 상수
3. Dashboard 좌상단 프로젝트 드롭다운

이 셋이 전부 `jvamvbpxnztynsccvcmr` 여야 함. 2026-04-22 아침에 `vvsyqcbplxjiqomxrrew` (YAGI STUDIO) 에 secrets/Edge Function/cron 잘못 설치했다가 복구한 사건 있음.

### 환경변수 (`.env.local`)
- Supabase: jvamvbpxnztynsccvcmr.supabase.co
- Google OAuth: refresh token 발급 완료 (Testing 모드라 7일 만료 주의)
- Resend: 운영 키
- Popbill: MODE=test, LINK_ID=YAGIWORKSHOP, SECRET_KEY 채워짐, CORP_NUM 미입력 (사업자등록번호 10자리 넣어야 발행 가능)
- Telegram: Builder 알림 봇
- Anthropic: API 키
- 빌드 설정: AUTOBUILD_MAX_EVAL_LOOPS=2 (Karpathy 모드)

### Codex CLI
- `C:\Users\yout4\.codex\config.toml`: `model = "gpt-5.4"`, `model_reasoning_effort = "high"`
- 인증: ChatGPT Plus (yagi@yagiworkshop.xyz)
- 용도: Phase K-05 adversarial review

---

## 🛠️ 운영 스크립트 (재사용 가능)

`scripts/` 디렉토리에 커밋됨:
- `setup-supabase-secrets.ps1` — .env.local 파싱해서 RESEND/ANTHROPIC/TELEGRAM 키를 Supabase secrets에 등록
- `deploy-edge-functions.ps1` — supabase/functions/ 아래 모든 Edge Function 배포
- `cleanup-wrong-project.ps1` — 엉뚱한 프로젝트에 설치한 리소스 정리용 (복구 작업에 사용)

모두 `$projectRef = "jvamvbpxnztynsccvcmr"` 로 고정.

---

## 🚨 남은 TODO (우선순위 순)

### P1 — Phase 2.0 시작 시 같이 처리
2. **마이그레이션 히스토리 불일치 정리 (deferred)**
   - Remote DB `schema_migrations` 에는 23건 기록됨
   - 로컬 `supabase/migrations/` 에는 12개 파일만 존재 (11개 누락)
   - 누락 목록: `bootstrap_workspace_rpc`, `phase1_1_workspace_bootstrap_rpc`, `storage_policy_hardening_20260421`, `projects_update_rls_hardening_20260422`, `phase_1_2_5_video_pdf_intake_attachments_20260422`, `thread_attachments_storage_rls_20260422`, `phase_1_2_5_align_with_spec_20260422`, `phase_1_2_5_thread_attachments_storage_internal_hide_20260422`, `phase_1_3_meetings_20260422`, `phase_1_3_meetings_workspace_derived_20260422`, `phase_1_4_preprod_board_20260422`
   - `supabase db pull --linked` 시도 결과: Supabase가 `migration repair` 명령 제안했으나 **실행 위험** (누락 11개를 reverted 로 마킹하면 반영된 스키마와 불일치)
   - **안전한 해결책 (Phase 2.0 시작 시):** `db dump` 로 현재 스키마 스냅샷 뜬 후 baseline 재설정. 당장은 remote DB가 ground truth 로 정상 동작하니 긴급하지 않음.

### P1 — Popbill 관련
3. **사업자등록번호 `POPBILL_CORP_NUM` 입력** — 없으면 세금계산서 발행 불가
4. **Mock → test 실발행 테스트** — `.env.local` POPBILL_MODE=test 상태. Admin dashboard "재발행 필요" 섹션에서 기존 mock invoice 재발행 테스트

### P2 — Phase 2.0 계획 시
5. Phase 1.9 deferred MEDIUM/LOW 9개 (caption 영구저장, embed host strict matching, `/work` OOB 클램프 등)
6. Phase 1.2.5 + 1.3 deferred follow-ups (Codex K-05 남은 항목)
7. Google OAuth Testing → Production 승격 (현재 refresh token 7일 후 만료)
8. 테스트 계정 / 시드 데이터 스크립트

---

## 🐙 Git 상태

- **리모트:** https://github.com/Botanicbox0/yagi-workshop (push 완료 2026-04-22)
- **브랜치:** `main`
- **커밋 구조 (3개):**
  1. `7dd3f48` — chore: initial project scaffolding + ops scripts
  2. `e9cba13` — docs: B-O-E autobuild methodology + phase 1.0-1.9 specs
  3. `a914cc6` — feat: phases 1.0-1.9 complete
- **Git identity:** local repo scope로 설정됨 (global 아님)

### 주의할 점 (다음 push 시)
- `public/assets/other/` 안에 15~42MB PNG 5개 있음. GitHub 50MB warning 임계 근접.
- Phase 2.0 때 Git LFS 도입 검토 (대용량 이미지 / 비디오 자산 늘어날 예정이면 필수)

---

## 🔐 보안 인시던트 기록 (2026-04-22)

### 인시던트 1: 잘못된 Supabase 프로젝트에 설치
- 2026-04-22 오전 `YAGI STUDIO` (vvsyqcbplxjiqomxrrew, 레거시) 에 secrets/Edge Function/cron 설치
- `yagi-workshop` (jvamvbpxnztynsccvcmr, 정답 프로젝트) 로 이주 완료
- **원인:** `.env.local` 의 `SUPABASE_URL` 과 스크립트 `$projectRef` 상수 대조 안 함
- **예방:** 이후 모든 스크립트 상단에 `jvamvbpxnztynsccvcmr` 하드코딩, 주석으로 이유 명시

### 인시던트 2: `docs/google-oauth-setup.md` 에 Google OAuth Client Secret 평문 커밋
- GitHub push protection 이 첫 push 시점에 차단 ✅
- 리모트 노출은 없었음
- 로컬 파일 + 이전 commit 트리에만 존재 → `git reset --soft HEAD~2` 로 재작성
- **예방:** `.env.local.example` 에만 placeholder 남기고 문서에는 실제 값 절대 쓰지 않음
- **후속:** Google OAuth Client Secret 회전 권장 (Google Cloud Console → Credentials → yagi-studio → Reset Secret). Testing 모드 + 7일 refresh token 만료로 실제 위험도는 낮지만 이상적으로는 회전 후 `.env.local` 갱신.

### 인시던트 3: `summary-phase-1-8.md` 에 Resend API key 평문
- Builder 가 summary 에 example 명령어 그대로 기록
- 전수 스캔 후 placeholder 로 교체
- **예방:** Phase spec / summary 에는 `re_<your-key>` 형태의 placeholder 만 사용

---

## 📦 2026-04-22 세션 요약

이 세션에서 일어난 일:
1. Phase 1.3 spec 마무리 (E-05 email rendering, parallelism plan, kill-switch 테이블, Codex review prompt)
2. Google OAuth Client 생성 + Calendar API 활성화 + Playground로 refresh token 발급
3. `.env.local` 정리 + `docs/google-oauth-setup.md` 생성 (후속 보안 인시던트 #2)
4. Codex CLI 세팅 (`gpt-5.4` + high reasoning)
5. Autopilot 프롬프트 던짐 → Phase 1.2 → 1.9 전체 완주
6. Phase 1.5 mock 모드 진입 명령 (spec에 ADDENDUM 추가)
7. Supabase 세팅 실수 + 복구 (인시던트 #1)
8. Popbill 승인 나서 `.env.local` POPBILL_MODE=test 로 전환
9. Cron 10분 간격 실행 + notify-dispatch end-to-end 검증 완료
10. Git init → 3커밋 → push (인시던트 #2, #3 발견 + 수정 + 재push)

---

**HANDOFF 최종. Phase 1 완주 + Git 동기화 완료. 다음은 Phase 2.0 계획. 🚀**
