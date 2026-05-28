# AGENTS.md — .yagi-autobuild/ (product spec & ops)

> Scoped rules for the spec/ops layer. Inherits top-level `AGENTS.md`.

## PRODUCT-MASTER.md is a living document
- 본문은 항상 현재 진실로 직접 수정한다. git이 버전 관리/백업한다.
- 큰 변경은 commit message에 사유를 명시한다.
- 문서 맨 끝 `Decision Log`에 날짜+한 줄로 무엇이 왜 바뀌었는지 기록한다.
- 날짜 표기는 절대일자 (`2026-05-28`), 상대 표현 X.

## Phase / Wave 작업 패턴
- 작업 단위 = **Wave**. 새 Phase/Wave는 `spec-template.md`에서 시작 (mandatory "Secret hygiene" 헤더 포함).
- Phase/Wave KICKOFF.md: 목표 / scope / out-of-scope / 의존성 / verify 기준 / risk-level을 명시.
- Cross-phase 계약은 `contracts.md`에 기록 — 새 table/RPC/notification event/storage bucket/realtime add 시 **같은 PR에서** 갱신.
- Cross-phase env: `.env.local.example` (placeholder + 주석) + `HANDOFF.md` (현재 ops state).

## DB write protocol (요약 — 전문은 CLAUDE.md)
- prod DB write 전 **Codex K-05 adversarial review mandatory** (HIGH/DANGER). 프롬프트는 `CODEX_PROMPT_TEMPLATE.md`, 분류는 `CODEX_TRIAGE.md`.
- CLEAN → apply → verify (advisors + smoke) → commit → push → Telegram/Slack.
- 비-auto 분류(HIGH-B/C, MED-C, LOW-C) 또는 taxonomy mismatch → STOP + escalate.
- SPEC drift (migration이 downstream SPEC와 충돌) → halt, SPEC 먼저 amend.

## Hermes / Codex config mirror
- `hermes-config/`에 router SOUL.md + Codex profile/system/memory + context-pack/rollback 스크립트 mirror 보관 (git record).

## Secret hygiene
- 실제 secret 값은 `.env.local` (gitignored) 또는 Supabase Vault에만. spec/doc엔 placeholder만.
- 새 credential 패턴은 `.husky/pre-commit` scanner에 추가 (inline regex). 자기-문서화는 `:(exclude)` pathspec 처리.
