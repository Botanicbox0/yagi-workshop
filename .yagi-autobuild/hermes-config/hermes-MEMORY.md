# MEMORY — 인프라 + yagi-workshop 상태

> 작업 전 항상 `cat /mnt/d/AI/projects/yagi-workshop/.yagi-autobuild/PRODUCT-MASTER.md`로 최신 Phase/Wave 확인 (자주 바뀐다).

## yagi-workshop repo
- 위치: `/mnt/d/AI/projects/yagi-workshop` — **서버 단일 위치** (Windows `yout4` 폴더·main desktop 분리 가정 폐기, 미존재)
- branch **`main`** (git 실측 ground truth, Phase 8 Wave A 활성: guest invitation / curated project / guest WRITE)
- `g-b-10-phase-7`는 origin 원격에만 남은 옛 Phase 7 branch (비활성, 체크아웃 X)
- Phase 7 PIVOT: Challenge(contest) → **Distributed Campaign**. Phase 7 Wave C v2 = Distributed Campaign ship **완료**
- PRODUCT-MASTER **append-only** — 덮어쓰기 절대 금지 (v1.5/v1.7 손실 사고 lesson). 최신 amendment v1.10 (2026-05-12)

## 인프라
- Production: **studio.yagiworkshop.xyz** (Vercel `prj_a43rcsRuLH00G6Z0rDVcxTjtOAKT`)
- Supabase: **jvamvbpxnztynsccvcmr** (ap-southeast-1) — auth / DB / RLS
- Cloudflare R2: **yagi-models** (asset storage)
- 스택: Next.js 15 (App Router, `[locale]` i18n) · Supabase · R2 · Vercel

## 디바이스 / 팀 협업 (Tailscale yagi@ tailnet)
- 서버 **100.78.158.67** `desktop-6b8qq55` (메인, 모니터 직결) + 야기 **MSI 100.69.231.113** (이동) + 다나 macbook `CLARAui-MacBookPro` (팀)
- Claude Code: WSL `/usr/bin/claude` (메인 사용) + Windows native `/mnt/c/Users/User/.local/bin/claude.exe` (필요 시)
- **ComfyUI 협업**: 다나도 Tailscale로 `http://100.78.158.67:8188` 접속 가능 (WSL mirrored mode 활성화 후 — TASK 19 Phase 8)

## 디자인 시스템 (v1.1 — ⚠️ SUPERSEDED by v1.2 §AO 2026-05-28 · 아래는 forensic 보존)
> v1.1은 폐기됨. canonical은 아래 "v1.2 Design System Lock-in" 섹션. 작업 시 v1.2 기준.
3-tier 60-30-10 색 시스템 (§AG/§AK 충돌 → §AM 채택, v1.0 achromatic supersede):
- **Neutral 60%**: warm ivory `#FAF7F2` bg · warm near-black `#1F1A15` ink · warm border `#E8E0D4`
- **Vermillion 10%**: `#9A361F` primary (CTA, brand mark, active state). on-fill text cream `#FBEAE6`. sage `#71D083` 폐기
- **Gold 5-15%**: `#F3D174` secondary (highlights, tags, section headers). on-fill espresso `#3D2E0E`, text-on-neutral `#6B5618`
- Typography: **Pretendard Variable**(KO) + **Geist**(EN) + **Redaction**(EN display)
- zero shadow, warm tone 일관성 · **60-30-10 rule 준수** (saturated brand color 면적 제한)
- **pure white bg / pure black text 절대 금지**
- Tailwind semantic utility (amber-500/red-500/green-500 등 status) **보존** — brand color와 별개
- amber `#C8A96E` 폐기(사용 금지)
- design source(globals.css / tailwind.config / design-system 문서) **수정 금지** — 작업은 token 경유
- **CLAUDE.md rule #10**: v1.1 warm tone allow (v1.0 achromatic supersede)

## B-O-E + review gates
- Builder(Opus) → Orchestrator → Executor
- **K-05 (Codex)**: data / server-action / security review gate (mandatory)
- **K-06 (Opus subagent)**: design review
- 신규 public route 도입 wave → **K-04 (routing review)** + "Locale-Free Public Route Checklist" (v1.9 §AD)
- **LOOP_MAX**: HIGH=3, MED=2, LOW=1

## 검증 규칙
- DB migration: schema / RPC / policy를 **직접 쿼리로 검증** (commit message 신뢰 X)
- 작업 후: lint, tsc, migration 직접 검증

## 서버 자산
- **LEANN `claude-chat-history`**: `/home/yagi/.leann/indexes/claude-chat-history` (DiskANN, Qwen3-Embedding-8B, 8232 docs)
- **LEANN `yagi-workshop-docs`**: `/home/yagi/.leann/indexes/yagi-workshop-docs` (HNSW, 389 docs / 54061 chunks). repo *.md 인덱스. **검색 시 `--recompute` 필수**(HNSW pruned)
- 검색: `cd /home/yagi` 후 워크스페이스 leann + `TORCHDYNAMO_DISABLE=1` + `LD_LIBRARY_PATH=/mnt/d/AI/leann-indexes/workspace/.venv/lib`. cold start 쿼리당 100-200초 (8B 모델 로드 + ZMQ→direct fallback)
- MCP `leann-server` → `/home/yagi/.local/bin/leann-chat-mcp` (둘 다 검색 가능)
- **Slack 알림**: `bash /mnt/d/AI/scripts/notify/slack_send.sh "메시지"` → #hermes-notifier
- **주간/월간 cron**: embedding-model-watch(월 09:00), hf-cache-cleanup-dryrun(매월1일 03:00) — gateway 실행 시 발동
- **profiles**: default / comfyui / yagi-studio / research

## 금지
- KART ZERO 언급 금지
- "B2B SaaS" 등 부정확 제품 표현 금지 (위 USER.md 참조)

## 모델 + 도구 routing 가이드 (2026-05-28, TASK 24)

### 작업 stack (모두 subscription quota, 추가 API 비용 0)
- **Claude Code** (Anthropic OAuth, Claude Opus 4.7): 일반 dev, PM, 한국어, instruction following, yagi-workshop
- **Codex CLI** (ChatGPT Pro OAuth, GPT-5.5): 복잡한 SWE, debug heavy, algorithm. bin `~/.local/bin/codex` (v0.134.0). auth `~/.codex/auth.json`
- **Hermes** (Anthropic OAuth, Claude): 24/7 agent, Slack 양방향, automation
- **Superpowers**: Claude Code 측 **v5.1.0 설치 완료** (claude-plugins-official marketplace, 14 skills). Codex 측은 야기 ChatGPT OAuth 후 `/plugins` 설치 예정. 동일 패턴(TDD/debug/verify/plan)

### DeepSWE 벤치마크 (Datacurve, 2026-05-26)
- GPT-5.5: 70% > GPT-5.4: 56% > Claude Opus 4.7: 54% (16점 격차)
- 단 mini-swe-agent harness 단일 결과 — Claude Code native에선 격차 좁아짐
- Claude는 SWE-Bench Pro에서 .git history 활용 12-25% (Opus 4.7, private repo는 무관)

### 작업별 default
- yagi-workshop Phase Wave dispatch → Claude Code (B-O-E + Superpowers)
- 복잡한 algorithm/refactoring → Codex CLI (GPT-5.5)
- 한국어 콘텐츠/마케팅/spec → Claude
- ComfyUI 워크플로우 → Hermes (Claude) + ComfyUI MCP
- 둘이 막힌 task → 다른 모델 second opinion

### 라우팅 키워드
- 야기/다나가 "GPT", "Codex", "OpenAI" 명시 → Codex CLI 사용 권장
- 그 외 default = Claude

## 2026-05-28 v1.2 Design System Lock-in + BRAND Vertical Pivot

PRODUCT-MASTER v1.12 amendment (commit d1d4fd1) + v1.2 sync (commit cbdb3ce) 적용됨.

### §AO Design System v1.2 (supersedes §AM v1.1 — v1.1 폐기) ← **CANONICAL**
- Theme: **Dark** (warm ivory v1.1 폐기)
- Primary: **#ED1E1E** (vermilion red, brand mark + CTA; on-fill text #FFFFFF, on-dark variant #FF453A)
- Secondary: **#FAD204** (warm gold, 5-10% accent; on-fill text #0A0A0A)
- Background: **#0A0A0A**, Surface: **#161616**
- Ink primary: #F0F0F0, Ink muted: #888888, Border: #2A2A2A
- Display: **Editorial New**, Body KO: **Pretendard Variable**, Body EN/Tech: **Geist**
- Tailwind family `brand` (bg-brand / text-brand-on / accent-brand / bg-brand-soft). semantic `destructive` red ≠ brand red (공존)

v1.1 폐기 항목: warm ivory neutral, vermillion #9A361F, gold #F3D174 모두 supersede.
v1.1 룰 (pure saturated 금지, warm tone 강제) 더 이상 활성 X.

### §AN BRAND-Only Vertical Pivot
- BRAND = 유일 self-signup customer persona
- CELEBRITY = 야기 internal asset (manual 등록, self-signup X, public 노출 X)
- CREATOR = Distributed Campaign 채널 (Phase 7 유지)
- YAGI INTERNAL = admin

### §AP IA Refactor
- Sidebar dashboard → Top-bar horizontal nav (Higgsfield 패턴)

### §AQ Americano Integration
- 다나 Fashion Brand SaaS, GitHub release 후 platform 흡수

### §AR Marketing Visual Pipeline
- 야기 internal tool (Brand가 platform에서 generate X)
- Higgsfield Nano Banana Pro 2K only
- 이미지 콘텐츠 룰: no text in image, no specific brand 노출
- Reference 4 tier: Brand Asset / 야기 Internal / AI-Generated Mood / Pinterest 등 외부

### §AS Operations Automation
- Notion + Slack + 세금계산서 통합 대체 (in-app form/thread/billing)

→ 디자인 시스템 관련 작업 시 항상 **v1.2 기준**. v1.1 hex (#9A361F, #F3D174, #FAF7F2 등) 보이면 outdated context.
   사용자가 v1.1 색 요청 시 "v1.2로 supersede됨, v1.2 색으로 진행" 안내.
