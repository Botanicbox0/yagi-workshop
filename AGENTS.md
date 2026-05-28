# AGENTS.md — yagi-workshop (top-level Codex context)

> Committed canonical context for Codex Native (TASK 30A). Authoritative source of
> truth remains `CLAUDE.md` + `.yagi-autobuild/PRODUCT-MASTER.md`; on conflict, those win.
> Codex loads the nearest `AGENTS.md` + its parents — see `src/`, `.yagi-autobuild/`,
> `supabase/` for scoped rules.

## 정체성
- ㈜야기워크숍 (YAGI Workshop) — **AI Native Entertainment Studio**, Seoul. "We extend who you are."
- Product = **"AI Visuals for Musicians."** Tech-enabled AI Music Visual Studio + Distributed Campaign Platform.
- 현재: branch **main**, **Phase 8 후반**. Wave A.2.a backend ship 완료 (`521cfc1`), frontend pending.
- ❌ 표현 금지: "B2B SaaS", "마켓플레이스", "mass distribution platform". KART ZERO 언급 금지.

## PRODUCT-MASTER active rules (§AN–§AS, 요약)
- **§AN BRAND-Only Vertical Pivot** — BRAND = 유일 self-signup persona, 모든 surface가 BRAND 관점. CELEBRITY = 야기 internal asset (manual 등록, self-signup·public 노출 X). CREATOR = Distributed Campaign 채널.
- **§AO Design System v1.2 — Dark Brand UI** — dark이 main canvas + default. 확정 hex 아래 참조.
- **§AP IA Refactor — Horizontal Nav** — sidebar 폐기, top-bar horizontal nav (Higgsfield 패턴). Explore/Projects/Campaigns/Americano/Assets/Billing.
- **§AQ Americano Integration** — 다나의 fashion 룩북 SaaS, GitHub release 후 "Americano" module로 흡수 (Phase 9+).
- **§AR Marketing Visual Pipeline** — 야기/다나 internal tool only (Higgsfield CLI + Nano Banana Pro 2K). platform nav 항목 아님. 이미지 자체엔 텍스트·특정 brand 노출 X (UI overlay가 텍스트 담당).
- **§AS Operations Automation** — in-app brief/thread/versioning/schedule/billing이 notion+slack+세금계산서 통합 대체.

## Design System v1.2 — 확정 토큰 (NEVER v1.1)
- bg `#0A0A0A` · surface `#161616` · ink `#F0F0F0` · ink-muted `#888888` · border `#2A2A2A`
- **primary `#ED1E1E`** (brand red, ~10%: CTA/primary/active; on-fill `#FFFFFF`, on-dark variant `#FF453A`). Tailwind family `brand` (`bg-brand`/`text-brand-on`/`bg-brand-soft`).
- **secondary `#FAD204`** (gold, ~5–15%: highlights/tags; on-fill `#0A0A0A`)
- Display = Editorial New (EN) · Body = Pretendard (KO) / Geist (EN). 60-30-10, pill CTA, keep-all (KO).
- 절대 금지: pure-black `#000000` void, light main canvas, hardcoded literal (token 경유).
- **v1.1 (§AM) 전면 폐기**: Vermillion `#9A361F`, Gold `#F3D174`, warm-ivory neutral, sage `#71D083` — 모두 supersede. 발견 시 v1.2로 정정.

## 거버넌스
- **BRAND vertical lock** — BRAND = sole self-signup; CELEBRITY = internal manual asset.
- **K-05 dual review** (Codex K-05 adversarial) = HIGH/DANGER 작업에서만 mandatory: prod DB write, RLS/grants/SECURITY DEFINER, auth, destructive, deployment, billing. LOW/MED는 발동 X.
- **PRODUCT-MASTER.md living document** — 본문은 항상 현재 진실로 직접 수정한다. git이 버전 관리/백업한다. 큰 변경은 commit message에 사유를 명시하고, 문서 끝 `Decision Log`에 날짜+한 줄로 무엇이 왜 바뀌었는지 기록한다.
- secrets commit 금지 (`.husky/pre-commit` scanner). `--no-verify` 금지 — redact 후 re-stage.

## Commit pattern
- BOM-free UTF-8. Conventional prefix (`feat:`/`fix:`/`ops:`/`test:`).
- 끝에 `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
- push는 risk-level 정책 따름 (LOW: 수동, HIGH/DANGER: review+confirm 후).

## Claude Code Skill Reference (risk-level별 cat 정책)
스킬은 자동 로드 X — risk에 따라 필요 시 직접 `cat`:
- **LOW**: none unless necessary.
- **MED**: 1 relevant skill.
- **HIGH/DANGER**: 1–3 relevant skills + Claude review.

| 영역 | 스킬 파일 |
|---|---|
| Design / token / UI 작곡 | `.claude/skills/yagi-design-system/SKILL.md` |
| Next.js / Supabase / form / i18n / RLS 컨벤션 | `.claude/skills/yagi-nextjs-conventions/SKILL.md` |

## 작업 전/후
- 전: `cat .yagi-autobuild/PRODUCT-MASTER.md` (최신 Phase/Wave) · `git log -1 --oneline` · design token 파일 현재 상태. RAG summary만 의존 X — reference file 직접 read.
- 후: `pnpm lint` / `pnpm tsc --noEmit`. DB는 직접 쿼리로 검증 (commit message 신뢰 X). UI touch 시 Playwright smoke.
