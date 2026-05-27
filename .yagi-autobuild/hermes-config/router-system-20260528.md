# Hermes Self-Evolving Router — System Doc (TASK 26 v2)

Built 2026-05-28. yagi의 모바일/맥북/노트북 Slack 1 인터페이스로 yagi-workshop dev를
위임·학습·점진 자율화하는 3-layer 라우터.

## 3-Layer 아키텍처

```
yagi (Slack) ──▶ Hermes gateway ──▶ yagi-router profile
                                        │ (learn-from-claude-code meta-skill)
                                        ▼
   Layer 1  skill-catalog.md  ─── 어떤 Claude Code skill을 hint할지 선택
   Layer 2  learned-skills/   ─── 비슷한 과거 패턴의 dispatch template 재활용
   Layer 3  routines/         ─── 3회+ 안정 패턴, 야기 confirm 후 lock
                                        │
                                        ▼ tmux send-keys (-L socket)
                          claude-bg ◀──┴──▶ codex-bg (K-05 review)
                          (Claude Code,      (Codex --profile deep)
                           --dangerously-skip-permissions)
```

### Layer 1 — Skill Catalog (정적 인덱스)
- 빌드: `/mnt/d/AI/scripts/router/build_skill_catalog.sh` → `~/.hermes/skill-catalog.md`
- 스캔 위치 (이 머신의 실제 경로 — spec의 `/mnt/skills`는 없음):
  1. 프로젝트: `<repo>/.claude/skills/*/SKILL.md`
  2. Claude Code 플러그인: `~/.claude/plugins/**/skills/*/SKILL.md`
  3. Hermes: `~/.hermes/skills/*/*/SKILL.md`
- 현재 134개 skill 색인. 주 1회 자동 재빌드 (cron, 월 10:30).

### Layer 2 — Meta-Skill (호출 + 관찰 + 학습)
- `~/.hermes/skills/autonomous-ai-agents/learn-from-claude-code/SKILL.md`
- claude-bg 호출 → tmux 관찰 → 성공 패턴을 `~/.hermes/learned-skills/{task_type}.md`로 추출.

### Layer 3 — Routine Distillation (자동 routine화)
- learned-skill이 3회+ 동일 패턴으로 호출되면 야기에게 routine lock 제안 (Slack).
- 야기 YES → `~/.hermes/routines/{X}.md`로 promote. 이후 `[ROUTINE] {X}`로 직접 trigger.

## Executor layer (tmux + systemd)
- `claude-bg.service` / `codex-bg.service` (systemd --user, enabled).
- 각자 전용 tmux 소켓(`-L claude-bg` / `-L codex-bg`)에서 respawn 루프로 실행 → 독립·자가복구.
- 관찰: `/mnt/d/AI/scripts/router/tmux_capture.sh <session> <lines>`
- 대형 dispatch는 `~/.hermes/router/dispatch-<ts>.md`에 쓰고 한 줄로 read 지시 (send-keys 멀티라인 깨짐 방지).

## Self-evolution 흐름
1주차 학습 → 1개월 패턴 적용 → 3개월 60-70% 자율(목표). 매주 월 11:00 cron
(`yagi-router-weekly-evolution`)이 지난 주 routine/learned-skills 변화 + K-05 건수 +
야기 confirm 회수(감소 추세 = 자율성↑)를 보고.

## 야기/다나 Slack 사용 가이드
- 평소처럼 멘션: "ws에 README 마지막 줄 추가해줘", "yagi-workshop globals.css에 utility 추가",
  "Wave X 진행해" 등. SOUL.md의 yagi-router 트리거 패턴이 라우팅.
- LOW 작업은 confirm 없이 진행, MED는 dispatch 보여주고 confirm, HIGH는 K-05 + confirm.
- routine 제안이 오면 Y/N로 답. Y면 다음부터 `[ROUTINE] {이름}`으로 바로 실행.

## K-05 위험 작업 룰
- 위험(rm / deploy / migration / billing / security / 코드 push) = HIGH.
- codex-bg에 adversarial review 강제 (`.yagi-autobuild/CODEX_TRIAGE.md` 분류) + 야기 confirm 강제.
- router는 절대 직접 코드 수정/PRODUCT-MASTER 수정 안 함.

## ⚠ 보안 노트
claude-bg는 `--dangerously-skip-permissions`로 yagi-workshop repo에서 상시 대기한다.
tmux 소켓에 send-keys 할 수 있는 주체(로컬 yagi 유저 + Hermes 게이트웨이)는 권한 확인 없이
임의 명령을 실행할 수 있다 — 이것이 의도된 router 설계이며, MED/HIGH confirm gate와 K-05가
완화 장치다. Slack bot 토큰/게이트웨이 접근이 곧 코드 실행 권한임을 인지할 것.

## Spec 대비 변경점 (이 머신 현실 반영)
- `/mnt/skills` 미존재 → 실제 3개 위치 스캔.
- 프로필은 단일 yaml이 아니라 디렉터리 → `hermes profile create --clone-from yagi-studio`로 생성.
- 메타-skill은 top-level 대신 `autonomous-ai-agents/` 카테고리 하위 (Hermes 발견 규칙).
- catalog 파서: 단일줄 + YAML block scalar(`>-`) 모두 처리.
- cron 10:30/11:00로 stagger (기존 hermes_update 10:00 충돌 회피).
- 주간 보고 `--deliver local` (기존 cron 패턴과 동일). Slack 전송 원하면
  `hermes cron edit yagi-router-weekly-evolution --deliver platform:<slack_channel_id>`.

## 검증 결과 (build time)
- claude-bg / codex-bg active, 전용 소켓 독립 확인.
- catalog 134 skill 빌드.
- yagi-router profile 유효 (91 skills, learn-from-claude-code enabled).
- dispatch 라운드트립 검증: send-keys → claude-bg "ROUTER_SMOKE_OK" → capture 회수 성공.

## 야기가 직접 돌려야 할 라이브 트라이얼 (Slack)
이 트라이얼은 실제 Slack 메시지가 필요해 빌드 단계에서 자동 실행 안 함:
1. LOW: "ws README.md 마지막에 '<!-- Hermes router test -->' 추가" → commit/push + learned-skill 생성 확인.
2. 같은 작업 2회차 → learned-skill 재활용 확인.
3. 3회차 → routine 후보 알림 확인.
4. MED: "globals.css 새 utility class 추가" → dispatch DM + confirm 확인.
5. HIGH: "npm script 'clean' 실행 + push" → K-05 강제 + confirm 확인.
