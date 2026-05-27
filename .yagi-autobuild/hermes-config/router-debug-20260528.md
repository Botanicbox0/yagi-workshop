# Hermes Router — Debug & Hardening (TASK 27)

2026-05-28. Trial 1 + 1.5 진단 후 룰 강화 + gateway hardening.

## 진단 결과

| # | 증상 | 근본 원인 |
|---|---|---|
| 1 | README working tree 수정만, commit/push X | system_append(SOUL.md) 절차 step 10-11이 soft guidance라 강제력 없음 |
| 2 | `~/.hermes/learned-skills/` 빈 상태 | 작업 후 learned-skill 작성이 강제되지 않음 |
| 3 | Slack 응답에 commit hash / learned-skill 정보 누락 | 응답 형식 미규정 |
| 4 | gateway 00:55~ 14회 restart 루프, 05:22 안정화 | **stale `gateway.pid`/`gateway.lock`** (dead PID 4613) → `hermes gateway run`이 "already running"으로 exit 1 → systemd Restart 반복 |

## 룰 강화 (SOUL.md = system_append)

`~/.hermes/profiles/yagi-router/SOUL.md`에 **CRITICAL POST-WORK PROTOCOL** 추가
(절차 step 10-11을 대체·강제):

- **Step A — Commit + Push**: 작업 후 `git add/commit/push origin main` 강제. dispatch에 명시.
  idempotent(변경 없음)만 commit skip 허용, Step B는 그래도 강제.
- **Step B — Learned-skill 작성/업데이트**: `~/.hermes/learned-skills/<task_slug>.md` 강제.
  형식은 meta-skill §5. idempotent skip 케이스도 기록. Invocations ≥3 → routine 후보.
- **Step C — Slack 응답 형식 강제**: 4줄 고정
  `✅/⚠️/❌ 결과 / commit: hash / learned-skill: 파일 / 다음 추천 step`.
- **Step D — 위반 시 self-correction**: skip 발견 시 다음 turn에 자체 알림 + 누락 step 수행.

## Gateway hardening

`hermes-slack-gateway.service`에 stale-lock cleanup 추가:
```
ExecStartPre=/bin/bash -c 'hermes gateway stop 2>/dev/null; sleep 2; true'
```
- 시작 전 stale gateway.pid/lock을 정리 → "already running" exit 1 루프 제거.
- Type=simple 유지 (WSL에서 `hermes gateway run` 권장 방식, fork 아님).
- 검증: daemon-reload + restart 후 Main PID 21985, NRestarts=0, 안정 active 확인.

## Phase 1 정리
- README.md (Trial 1 + 1.5 마커) commit + push 완료 (`3fc7557`).
- 그 외 working tree clean (design v1.2 파일은 task 간 이미 정리됨).

## 야기 재테스트 가이드
1. Slack #hermes-notifier:
   `@Hermes Notifier router status 종합 보고: CRITICAL POST-WORK 룰 적용 여부 + 마지막 README 작업 commit 상태 + learned-skills 폴더 상태`
   → 응답이 4줄 강화 형식(✅/commit/learned-skill/다음 step)이면 정상.
2. Trial 2 (MED):
   `@Hermes Notifier yagi-workshop의 src/app/globals.css에 .text-router-mark { color:#ED1E1E; font-weight:700; } 추가해줘`
   → MED 판정 → confirm 요청 → YES → claude-bg dispatch → commit+push + learned-skill 생성 + 강화 형식 응답.

---

# TASK 28 — v1.2 design system 인지 (append)

## Trial 2 결과 분석
Trial 2 (05:55)에서 router가 `#ED1E1E`를 **brand color 위반으로 정확히 catch + 거부**.
자율 거부 능력 자체는 정상(good). 문제는 **v1.1(§AM, 폐기됨) 기준**으로 판단 — v1.2(§AO,
commit d1d4fd1+cbdb3ce) 미인지 = context staleness.

## 근본 원인
1. LEANN `yagi-workshop-docs` index가 2026-05-27 20:45 sync (v1.2 commit 04:40/05:20보다 8h 이전).
2. Hermes `MEMORY.md` design 섹션이 v1.1 canonical.
3. yagi-router `SOUL.md`에 v1.2 명시 없음.

## 조치
- **MEMORY.md**: v1.1 섹션 "SUPERSEDED" 표기 + v1.2(§AO) canonical 섹션 + §AN-§AS amendment 추가.
- **yagi-router SOUL.md**: "Design System Context (v1.2 active)" 블록 추가 (hex + dark theme + v1.1 reroute 안내).
- **LEANN index 재빌드**: 100,471 chunks. 직접 grep 검증 — #ED1E1E ×27, #FAD204 ×22, "Dark Brand" ×15, §AO ×19 색인 확인.

## ⚠️ 사고 + 복구 (정직 기록)
1차로 incremental sync(`leann build` no --force) 시도 → leann이 변경 2파일만 잡고 "full rebuild
fallback"하며 **기존 인덱스를 54,061→37 chunk로 파괴**. 즉시 발견 → `leann remove --force` →
**처음부터 full rebuild(--force)**로 복구. 교훈: 이 leann 버전에서 HNSW index 갱신은 incremental
신뢰 불가 → 항상 `remove + 전체 rebuild`.

## 알려진 한계 (follow-up)
재빌드가 `--include-hidden`로 **node_modules .md 1,754개(~47% chunk)를 같이 색인**함
(repo `/node_modules` gitignore를 leann build가 무시). v1.2 검색에는 지장 없으나 인덱스가
49MB→93MB로 비대 + 노이즈. **clean rebuild(node_modules 제외) follow-up 필요** — leann build에
exclude 플래그 없으므로 빌드 중 node_modules 임시 격리 방식 권장. 야기 AFK 시 실행.

## 재검증
- index 健全: 100,471 chunks, documents.index 27MB, pruning 정상.
- leann-daemon + hermes-slack-gateway restart 후 active.
- Hermes 측 인지는 야기 Slack Trial 2 재시도로 최종 확인 (아래 가이드).
