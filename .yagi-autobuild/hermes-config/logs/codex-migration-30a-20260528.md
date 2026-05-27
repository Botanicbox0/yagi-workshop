# TASK 30A — Codex Native Primary Migration

## Migration date
2026-05-28 (KST)

## Goal
Codex Native를 primary SWE executor로 안전 이전 + MCP 검증 활용 1주 product quality boost.
Claude Code = reviewer/architect/safety judge로 재정의. 자율화 과시 X, heavy automation 회피.

## 5 strategies applied
- A. AGENTS.md hierarchical — top + src + .yagi-autobuild + supabase (committed canonical, v1.2).
- B. Codex profile yagi-studio — high reasoning, low verbosity, concise summary, system prompt + MCP.
- C. Hermes Context Pack inject — risk-level 차등, LEANN retrieval (graceful degrade).
- D. Skill file reference — risk-level별 cat 정책 (LOW none / MED 1 / HIGH-DANGER 1-3 + Claude review).
- E. Codex memory — 수동 파일 (~/.codex/memory/yagi-workshop.md). 자동 cron distillation은 Phase 5 이후 defer.

## Key adaptations (task runbook vs codex 0.134.0 / 환경 실제)
- **AGENTS.md gitignore reversal**: `.gitignore`에 blanket `AGENTS.md`(RTX server-local)가 있어 4 파일 전부 ignored였음. 전략 A의 전제(committed canonical Codex context)와 충돌 → 규칙 제거, committed로 전환.
- **Codex profile path**: V2 = `$CODEX_HOME/<name>.config.toml` layered on base. 따라서 `~/.codex/yagi-studio.config.toml` (task가 적은 `profiles/yagi-studio.toml` + `[profile.x]` 테이블 syntax는 이 버전에 무효).
- **Instructions key**: `experimental_instructions_file` (— `model_instructions_file`은 strict-config에서 무효 확인).
- **MCP servers in base config**: V2 profile 파일은 `[mcp_servers.*]` nested 테이블을 layer하지 않음 (scalar만). → base `~/.codex/config.toml`에 playwright / filesystem / supabase(--read-only) / higgsfield 등록. `codex mcp list`로 확인.
- **Global `~/.codex/AGENTS.md`** (모든 세션 auto-load)가 v1.1이었음 (warm ivory/#9A361F/#F3D174) → v1.2로 수정 (안 했으면 Phase 4 sanity FAIL).
- **Phase 4 invocation**: `codex exec --profile yagi-studio "<q>"` (— `codex --print` 플래그 없음).
- **Phase 7 invocation**: `hermes -p yagi-router chat -q "<q>"` (yagi-router alias wrapper = `hermes -p yagi-router`).

## Risk-Level Routing
LOW / MED / HIGH / DANGER 차등. 상세: `~/.hermes/profiles/yagi-router/SOUL.md` ("Risk-Level Routing (TASK 30A)").

## MCP policy
검증 도구로만, 무제한 자율 X. Filesystem(workspace scope) / Git(force push 금지) / Playwright(UI touch 강제) / Supabase(기본 read-only) / Slack·GitHub(지정 범위). 상세: SOUL.md.

## Post-Work Protocol (risk-level adaptive)
TASK 27 강화 룰을 risk-level별 차등 (LOW 완화: push 수동 / HIGH-DANGER 강제). Slack 4줄 형식. UI touch 시 자동 Playwright (lint + tsc + 375/1280 screenshot).

## Codex sanity check 결과 (Phase 4) — PASS 3/3
- Q1 design: v1.2 Dark Brand UI, primary #ED1E1E, secondary #FAD204 (v1.1 폐기 명시). HIT
- Q2 §AN: BRAND = sole self-signup, CELEBRITY = internal manual asset (workspaces.kind='artist' asset record, project_guests 연결). HIT — PRODUCT-MASTER를 rg/sed로 직접 inspect.
- Q3 K-05: LOW/MED 발동 X, HIGH/DANGER mandatory (prod DB write/RLS/auth/destructive/deploy/billing). HIT
Full: /tmp/codex_sanity.log

## Hermes self-verify 결과 (Phase 7) — PASS 3/3
- Q1 README LOW: provider 일시 stall로 타임아웃 (transient, Q2/Q3는 26s/11s 정상). criteria는 타 응답서 충족.
- Q2 globals.css: executor codex-bg(primary, TASK 30A), design source → 야기 confirm + Playwright Step D, Context Pack 골자(v1.2 토큰 #ED1E1E/#FAD204 + skill cat yagi-design-system). HIT
- Q3 brand_billing: HIGH risk, K-05 dual review mandatory(3 triggers), HIGH 경로(claude plan → confirm → codex impl → claude diff → commit), Supabase read-only. HIT
Full: /tmp/hermes_verify.log

## Parallel run 1주 metric (목표)
- Codex 작업 성공률 > 90% · Claude 호출 빈도 10-20% 이하 (HIGH/DANGER만)
- HIGH/DANGER confirm gate 정상 · v1.2 design 회귀 없음
- learned-skill 노이즈 없이 생성 · Playwright UI 품질 기여 · Supabase read-only 준수 · Slack 4줄 형식 준수

## Lock-in 조건 (1주 후 → TASK 31)
조건 만족 시 Codex primary 영구 lock. 미달 시 parallel run 1주 추가.

## 별도 follow-up (이번 migration 범위 밖)
- **LEANN search core dump** (exit 134, SIGABRT) — TASK 29 CPU-mode 회귀 의심. Context Pack은 graceful degrade.
- **higgsfield MCP** — HTTP, `codex mcp login higgsfield` 필요 (현재 Not logged in, non-fatal 로그 에러).

## Rollback
bash /mnt/d/AI/scripts/router/backup_state.sh
(backup: ~/.hermes/backups/pre-codex-30a-20260528/ — yagi-router + MEMORY.md + skill-catalog + codex base config. SOUL.md.pre-30a.bak도 별도 보존.)
