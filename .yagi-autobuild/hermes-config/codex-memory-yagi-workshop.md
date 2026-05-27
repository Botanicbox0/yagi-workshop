# yagi-workshop Memory

## Recent commits (2026-05-28)
- dc4d0b0 ops: LEANN CPU mode for ComfyUI 공존 (TASK 29)
- 90ca52f ops: Hermes router context update — v1.2 design system 인지
- 4a844fc ops: Hermes router 룰 강화 — Critical Post-Work Protocol
- 3fc7557 test: Hermes router Trial 1 + 1.5 markers (idempotent verification)
- 1c999e1 ops: Hermes self-evolving router system (3-layer: catalog + meta-skill + routine distillation)

## Active decisions
- PRODUCT-MASTER §AN–§AS lock (append-only).
- Design system v1.2 dark lock (#0A0A0A bg, #ED1E1E primary, #FAD204 secondary, Editorial New + Pretendard/Geist). v1.1 (#9A361F / #F3D174 / warm ivory) 전면 폐기.
- BRAND vertical pivot (§AN): BRAND = sole self-signup, CELEBRITY = internal manual asset.
- Phase 8 후반: Wave A.2.a backend ship (521cfc1), frontend pending.
- Americano integration plan (다나 fashion 룩북 SaaS, GitHub release 후 Lookbook Studio module §AQ).
- Hermes self-evolving router with Codex Native primary (TASK 30A migration).

## 야기/다나 협업 패턴
- 야기: strategic + dispatch trigger via Slack.
- 다나: 콘텐츠 작업 (분리).
- V1→V5 versioning (실 사례: KAIPER, SLOGK).
- in-app thread (notion+slack 통합 대체 §AS).

## 자주 쓰는 명령
- pnpm dev / pnpm lint / pnpm tsc --noEmit
- supabase MCP (read-only schema 검증)
- Playwright MCP (UI smoke after design change)
- git status / diff / log

## Notes
- 수동 유지 memory (전략 E). 자동 cron distillation은 Phase 5 이후 defer.
- Codex가 auto-load하지 않음 — AGENTS.md + experimental_instructions_file이 주 컨텍스트 경로. 이 파일은 참조/mirror용.
