# AGENTS.md — .yagi-autobuild/ (product spec & ops)

> Scoped rules for the spec/ops layer. Inherits top-level `AGENTS.md`.

## PRODUCT-MASTER.md is append-only
- **기존 § 내용 수정·삭제 금지.** 변경은 **supersede**로만 표현 (새 §가 옛 §를 명시적으로 대체).
- 새 § 추가 시 **다음 letter**를 부여. 현재 마지막 = **§AS** → 다음 = **§AT**.
- supersede 시 옛 §에 "(supersedes §XX)" / 새 §에 어느 것을 대체하는지 명기.
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
