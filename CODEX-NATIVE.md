# CODEX-NATIVE.md

Codex Native 운영 마스터. 목적은 야기워크숍 개발 루프의 primary SWE agent를 Codex로 고정하고, Claude/Hermes/legacy retrieval 잔재를 명확한 역할과 삭제 후보로 분리하는 것이다.

작성일: 2026-05-28
기준 HEAD: `00ae2b5 chore(env): pnpm corepack + approve-builds + playwright chromium setup`

## §0 운영 모델

- Codex = primary SWE agent. 일반 구현, 리팩터, 문서화, 검증, commit/push까지 기본 담당.
- Claude = 좁은 review gate. HIGH/DANGER 작업 또는 명시 요청된 diff review/second opinion에만 개입.
- Hermes = 원격 진입 layer. 현재 비활성. Slack/remote gateway 기반 단일 진입 환경으로 되돌릴 수 있도록 인프라는 보존하되 운영 루프는 Codex 직접 루프로 고정한다.

## 0.5 Hermes 로드맵

- 멀티 디바이스 / 원격 진입 (Slack → Codex dispatch): 접근성 목적. Codex 루프 검증 완료(오늘)로 활성화 가능. MSI 랩탑·다나 맥북·모바일 지원. 자동화가 아니므로 먼저 열어도 안전.
- 자동화 측면 (self-evolving, learned-skill, 자동 routing, Slack notify 고도화): 동결. Codex Native 안정화 후 단계적.
- 두 축은 분리한다. 멀티 디바이스 진입 ≠ 자동화.
- Hermes 인프라(gateway/SOUL/MEMORY/slack_send.sh): 보존. 멀티 디바이스 진입에 재활용.
- 최종 목표: Hermes 단일 안전 진입 (야기 ↔ Hermes ↔ Codex).

## §1 세션 시작 루틴

매 세션 시작 시 직접 read 우선.

1. `AGENTS.md`
2. `HANDOFF.md` 또는 archive handoff 존재 여부. 루트 `HANDOFF.md`가 없으면 없는 상태로 기록하고 진행.
3. `.yagi-autobuild/PRODUCT-MASTER.md` 마지막 active section. 2026-05-28 기준 active: §AN-§AS.
4. Codex memory. repo mirror는 `.yagi-autobuild/hermes-config/codex-memory-yagi-workshop.md`, 실제 Codex memory는 `~/.codex/memory`.
5. `git log -1 --oneline`
6. `.env.local.example`은 변수명과 policy만 확인한다. 값은 문서·응답·commit에 노출하지 않는다.

## §2 작업 루프

1. Read: repo 파일 직접 확인. RAG/chroma/codex memory는 보강용.
2. 구현 제안: 위험도와 변경 범위를 짧게 고정. 일반 LOW/MED는 제안에서 멈추지 않고 구현까지 간다.
3. 구현: 기존 패턴을 우선한다. `PRODUCT-MASTER.md`는 append-only.
4. 검증: 파이프 끝 검증 금지. `cmd | tail`, `cmd | tee`의 마지막 exit code로 성공 판단 금지. 명령 자체 exit code를 직접 확인한다.
5. Commit: 변경 파일만 stage. unrelated dirty worktree는 건드리지 않는다.
6. 보고: 결과 / 검증 / commit / 다음 조치의 4줄 형식.

## §3 Claude 개입 gate

Claude review gate는 아래에만 발동한다.

- HIGH/DANGER 작업
- security, auth, DB write, RLS/grants, `SECURITY DEFINER`, destructive command, deploy, billing
- 사용자가 diff review를 요청한 경우
- 사용자가 second opinion을 요청한 경우
- Codex가 같은 blocker를 반복해서 해결하지 못하고, review가 실질적으로 위험을 낮추는 경우

### §3.1 Review Packet Protocol

보안/auth/DB/RLS/billing/외부클라이언트/주요 디자인 변경 같은 critical wave 종료 시 Codex는 야기가 Claude Code에 그대로 붙여 넣을 수 있는 review packet을 출력한다. 상세 format은 `~/.codex/yagi-studio-system.md`의 `Review Packet Protocol`을 따른다.

원칙:

- machine check는 `pnpm lint`, `pnpm tsc --noEmit`, Playwright, visual smoke 각각의 실제 exit code로 채운다. 파이프 끝 성공으로 대체 금지.
- smoke를 생략하면 `skipped + reason`으로 표기한다. fake PASS 금지.
- `.env.local`, service role key, API key, token, Popbill SecretKey 같은 secret 값은 packet에 포함하지 않는다. 변수명만 허용한다.
- 단순 LOW/MED routine 작업에는 출력하지 않는다.

## §4 Claude 개입 금지

아래는 Codex 단독 처리.

- LOW/MED 일반 코딩
- UI polish
- docs
- 좁은 리팩터
- lint/tsc 안정화
- repo 문서 정리
- 삭제 후보 식별. 실제 삭제·이동·권한 변경·service disable은 별도 승인 전 금지.

## §5 risk -> commit/push 정책

| Risk | Scope | Commit | Push | Review |
|---|---|---:|---:|---|
| LOW | 문서, 좁은 UI copy, non-prod helper | Codex 가능 | Codex 가능 | 불필요 |
| MED | 일반 feature/fix, 리팩터, UI 구현 | Codex 가능 | Codex 가능 | 요청 시 |
| HIGH | auth, DB/RLS, billing, deploy 영향 | Codex 구현 후 review gate | 사용자 확인 후 | Claude/K-05 |
| DANGER | prod data write, destructive, force, credential, irreversible infra | 사용자 명시 승인 전 금지 | 사용자 명시 승인 전 금지 | Claude/K-05 mandatory |

공통 금지: force push, `--no-verify`, unrelated revert, 승인 없는 삭제·이동·chmod·systemd disable.

## §6 MCP 정책

`~/.codex/config.toml` 실제 `[mcp_servers]` 확인 결과(2026-05-28):

| MCP | 현재 설정 | 정책 |
|---|---|---|
| filesystem | `@modelcontextprotocol/server-filesystem`, scope = repo root | repo 작업 전용. scope 밖 파일은 read-only 성격의 확인만. |
| playwright | `@playwright/mcp@latest` | UI touch 시 smoke/screenshot 검증 자동화. docs-only는 생략 가능. |
| higgsfield | remote MCP URL | `codex mcp login higgsfield` 필요. 이미지/비디오 생성 자동화용, secret 노출 금지. |
| supabase | remote MCP URL, `read_only=true` | 기본 read-only. prod DB write/RLS/grants는 HIGH/DANGER gate. |
| github | remote MCP URL, token env var = `GITHUB_PAT_TOKEN` | force push 금지. token 값 문서화 금지. |

환경 변수 문서화 원칙: 변수명과 사용 policy만 기록한다. 값, token, URL secret, `.env.local` 내용은 기록하지 않는다.

## §7 retrieval

- Chroma `127.0.0.1:8900` = 보강용 retrieval. repo 직접 read보다 우선하지 않는다.
- 직접 확인 우선순위: source file -> canonical docs -> git history -> Chroma/RAG.
- LEANN runtime/index/service/tool/log는 2026-05-28 폐기 완료. 검색 latency와 안정성 문제로 Codex Native 루프에는 사용하지 않는다.
- `claude-chat-history` LEANN index는 보존. 운영 retrieval에는 사용하지 않는다.

## §8 스킬/MCP 이관 맵

| Legacy/Source | Codex Native 이관 | 현재 상태 |
|---|---|---|
| `yagi-context` | root `AGENTS.md`, scoped `src/AGENTS.md`, `.yagi-autobuild/AGENTS.md`, `supabase/AGENTS.md` | 이관 완료. 세션 시작 시 AGENTS 우선. |
| `yagi-design-system` | `src/app/globals.css`, `tailwind.config.ts`, `.yagi-autobuild/PRODUCT-MASTER.md` §AO | v1.2 dark tokens 확인. `#0A0A0A`, `#161616`, `#F0F0F0`, `#2A2A2A`, `#ED1E1E`, `#FAD204`. |
| Playwright 검증 패턴 | Codex 작업 루프 §2 + MCP `playwright` | UI touch 시 smoke/screenshot. docs-only 생략 가능. |
| Supabase 검증 패턴 | Codex 작업 루프 §3/§5/§6 + MCP `supabase` read-only | read-only 기본. write/RLS/auth는 HIGH/DANGER gate. |
| Higgsfield | CLI `/home/yagi/.local/bin/higgsfield` + Codex MCP `higgsfield` | CLI 설치/인증 완료. MCP는 별도 필요 시 `codex mcp login higgsfield`. token/secret 출력 금지. |
| GitHub | Codex MCP `github` | token env var 이름만 기록. force push 금지. |
| Hermes self-evolving / learned-skill | 동결 | `.yagi-autobuild/hermes-config/*`에 mirror 존재. 검증 전까지 learned-skill/routine 성장 금지. |
| Chroma RAG | Codex 보강 retrieval | `/mnt/d/AI/chroma` 및 `chroma-search.service` 존재. repo direct read 우선. |
| LEANN | 폐기 완료 | `yagi-workshop-docs` 계열/runtime/service/tool/log 제거 완료. `claude-chat-history`는 보존. |

### §8.2 Higgsfield CLI 사용법

설치/인증 상태:

- 설치: `npm i -g @higgsfield/cli --prefix /home/yagi/.local`
- PATH: `/home/yagi/.local/bin/higgsfield`
- 확인: `higgsfield --version`
- 인증: `higgsfield auth login`
- 금지: `higgsfield auth token` 출력, token/secret 로그화, `.env.local` 값 문서화, 생성 결과 무단 commit.

주요 명령:

- 모델 조회: `higgsfield model list --image`
- Nano Banana Pro 파라미터 확인: `higgsfield model get nano_banana_2`
- 비용 추정(생성 없음): `higgsfield generate cost nano_banana_2 --prompt "<prompt>"`
- 이미지 생성: `higgsfield generate create nano_banana_2 --prompt "<prompt>" --resolution 2k --aspect_ratio 16:9 --image ./reference.png --wait`
- reference 업로드: `higgsfield upload create ./reference.png`
- product photoshoot prompt enhancement: `higgsfield product-photoshoot create --mode product_shot --prompt "<intent>" --image ./product.png --count 3`
- prompt enhancement만 확인(생성 없음): `higgsfield product-photoshoot create --mode product_shot --prompt "<intent>" --image ./product.png --enhance-only`
- Higgsfield DTC ads: `higgsfield marketing-studio dtc-ads generate --prompt "<brief>" --format-id <format_id> --resolution 2k --quality high --wait`

Nano Banana Pro 지정:

- `job_set_type` = `nano_banana_2`
- 모델명 = Nano Banana Pro
- 주요 파라미터: `prompt`(required), `aspect_ratio`(`auto`, `1:1`, `3:2`, `2:3`, `4:3`, `3:4`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`), `input_images`, `resolution`(`1k`, `2k`, `4k`; default `2k`)
- CLI media flag: `--image <upload_id|job_id|local_path>`; local path는 auto-upload.
- §AR 기본값: `--resolution 2k`; 4K는 별도 upscale 단계로만 검토.

§AR 연결 정책:

- Nano Banana Pro 2K only. 플랫폼 marketing illustration은 pure imagery only.
- Higgsfield CLI는 내부 asset production 도구이며 platform nav 항목이 아니다.
- 이미지 자체에 text/logo/specific brand name 금지. 텍스트, CTA, label은 platform UI overlay가 담당.
- Prompt는 5-pillar 구조로 작성: Subject, Composition, Action, Location, Style.
- Reference는 4-tier 전략을 따른다: Brand Asset Library, 야기 Internal Library, AI-Generated Mood Board, 외부 inspiration reference.
- Reference image는 semantic naming 필수. `image 1`, `image 2` 같은 위치명 금지.
- 외부 Higgsfield 생성 결과는 repo로 바로 commit하지 않는다. 선별 후 platform 정적 asset 경로(`public/marketing/...`)로 업로드하고 파일명은 semantic naming을 사용한다.

## §9 잔재 삭제 후보

삭제 실행 금지. 아래는 2026-05-28 조회 기준의 식별·분류만이다.

| 후보 | 존재 | 크기 | 수정일 | 참조/영향 | 분류 |
|---|---:|---:|---|---|---|
| `.leann` | 있음 | 0 | 2026-05-28 06:02 KST | repo 내부 직접 참조 없음. 빈 `indexes/`만 존재. | 안전삭제 |
| `/home/yagi/.leann/indexes/yagi-workshop-docs` | 삭제됨 | 63M 회수 | 2026-05-28 | Chroma 전환 후 제거 완료. | 완료 |
| `/home/yagi/.leann/indexes/yagi-workshop-docs.8b-backup-20260528-1706` | 삭제됨 | 117M 회수 | 2026-05-28 | rollback backup 제거 완료. | 완료 |
| `/home/yagi/.config/systemd/user/leann-daemon.service` | 삭제됨 | 4.0K 회수 | 2026-05-28 | `disable --now` 후 unit 제거 완료. | 완료 |
| `/home/yagi/.config/systemd/user/leann-daemon.service.d` | 삭제됨 | 4.0K 회수 | 2026-05-28 | override 제거 완료. | 완료 |
| `/home/yagi/.local/share/uv/tools/leann-core` | 삭제됨 | 5.4G 회수 | 2026-05-28 | CLI/tool install 제거 완료. | 완료 |
| `/home/yagi/.cache/claude-cli-nodejs/*/mcp-logs-leann-server` | 삭제됨 | log cache 회수 | 2026-05-28 | Claude MCP LEANN log cache 전체 제거 완료. | 완료 |
| `.yagi-autobuild/hermes-config/systemd/leann-daemon.service*` | 삭제됨 | 20K 회수 | 2026-05-28 | 죽은 service mirror 제거 완료. audit 로그는 보존. | 완료 |
| `.yagi-autobuild/hermes-config/learn-from-claude-code-SKILL.md` | 있음 | 4.0K | 2026-05-28 05:24 KST | Hermes self-evolving meta-skill. §0.5에 따라 동결 대상. | 보존권장 |
| `.yagi-autobuild/hermes-config` | 있음 | 176K | 2026-05-28 18:45 KST | `.yagi-autobuild/AGENTS.md`가 mirror로 명시. Hermes gateway/SOUL/MEMORY 보존 정책과 연결. | 보존권장 |
| `/home/yagi/.config/systemd/user/chroma-search.service` | 있음 | 4.0K | 2026-05-28 18:41 KST | Chroma `:8900` retrieval daemon. §7 보강용으로 유지. | 보존권장 |
| `/mnt/d/AI/chroma` | 있음 | 6.6M | 2026-05-28 18:42 KST | Chroma persistent index. §7 보강용으로 유지. | 보존권장 |
| `/mnt/d/AI/scripts/chroma` | 있음 | 12K | 2026-05-28 18:41 KST | Chroma build/search/server scripts. §7 보강용으로 유지. | 보존권장 |
| `/home/yagi/.config/systemd/user/hermes-dashboard.service` | 있음 | 4.0K | 2026-05-28 00:44 KST | Hermes infra. §0.5 보존·동결. | 보존권장 |
| `/home/yagi/.config/systemd/user/hermes-slack-gateway.service` | 있음 | 4.0K | 2026-05-28 05:49 KST | Hermes remote entry infra. 현재 비활성 운용이나 보존·동결. | 보존권장 |
| `/home/yagi/.leann/indexes/claude-chat-history` | 있음 | 199M | 2026-05-27 05:40 KST | 명시 보존 대상. 삭제 후보 제외. | 보존권장 |

삭제 후보 처리 원칙:

- `안전삭제`: 야기 확인 후 별도 작업에서만 삭제.
- `확인필요`: 다른 workspace·rollback·service dependency 확인 전 삭제 금지.
- `보존권장`: 현재 운영 설계상 남긴다.

## §10 검증 교훈

- 파이프 끝 검증 금지. `cmd | tail` 성공은 원본 command 성공이 아니다.
- 코드 cite 시 직접 verify. commit message, RAG summary, 기억에 의존하지 않는다.
- `PRODUCT-MASTER.md`는 append-only. 기존 § 덮어쓰기 금지, supersede만 허용.
- `.env.local.example`은 변수명만 참조. `.env.local` 값은 read/report/commit 금지.
- 삭제 정리는 식별과 분류가 먼저다. 실제 삭제·이동·chmod·systemd service 변경은 별도 승인 후 진행한다.

## 환경 검증 완료 기록

2026-05-28 기준 기록:

- sandbox 검증 3/3 완료
- pnpm corepack/approve-builds 완료
- Playwright Chromium setup 완료
- 현재 Codex Native 문서 작업은 docs-only 변경이므로 UI smoke는 요구하지 않는다.
