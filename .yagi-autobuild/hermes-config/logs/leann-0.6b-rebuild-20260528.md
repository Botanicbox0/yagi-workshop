# TASK 32 — LEANN 0.6B 재인덱스 + 영구 daemon (SIGABRT 해결)

## Migration date
2026-05-28 (KST)

## 근본 원인 (TASK 30A + 32 진단)
**8B + CPU + LEANN recomputation 경로 자체가 SIGABRT(exit 134)**.
- TASK 30A 진단의 "영구 daemon 미등록 → cold start" 가설은 **부분적 원인**일 뿐이었음.
- 영구 daemon 등록 후에도 8B+CPU search는 동일하게 abort. 진짜 SIGABRT 위치는 **CLI 측 graph-traversal + 8B + recomputation** 경로.
- 직전 TASK 32 1차 시도의 "3/3 PASS"는 **bash `| tail` 파이프가 abort exit code 마스킹**한 가짜였음 (clean `--json --non-interactive` 재시도 시 동일하게 `Aborted (core dumped) exit 134` 확인).
- 0.6B 재인덱스가 유일한 fix 경로.

## 핵심 교훈
- **LEANN 검증은 `2>&1 | tail` 금지** — exit code 마스킹. 반드시 직접 실행 + `$?` 확인.
- **빌드 ≠ 검색** 환경 분리 가능: 빌드는 일회성 → ComfyUI idle 시 GPU 활용 (~5분). 검색은 영구 → CPU (ComfyUI 공존).

## 해결 (TASK 32 2차)
1. ComfyUI(`python main.py --port 8188`, PID 33351) SIGTERM stop → GPU 확보 (93 GiB free).
2. 좀비 leann_mcp 6개 + stale 8B embedding server(PID 61006, 16 GB) 정리.
3. **0.6B GPU 빌드 (5분 5초)** — `CUDA_VISIBLE_DEVICES=0 LEANN_EMBEDDING_DEVICE=cuda` 단일 명령 override.
   - 213 batches × ~0.5s/batch (GPU)
   - **54,431 chunks** (node_modules 격리로 노이즈 47% 제거)
   - Index: 63 MB (8B의 ~270배 작음)
4. node_modules 복원, 8B index 백업 보존 (`~/.leann/indexes/yagi-workshop-docs.8b-backup-20260528-1706/`).
5. `~/.config/systemd/user/leann-daemon.service.d/yagi-workshop-docs.conf` override로 영구 daemon 등록 (`--daemon-ttl 0`).
6. systemd cpu-mode.conf + .bashrc CPU env belt 유지 → daemon은 CPU 0.6B로 가동.

## 결과 (검증, 파이프 마스킹 없이)

| 항목 | 8B 이전 | 0.6B 현재 |
|---|---|---|
| **SIGABRT (exit 134)** | 매 search | **없음 (EXIT 0)** ✅ |
| Search 결과 정확도 | (abort) | 정상 (v1.2 토큰 hit, AGENTS.md / wave-c5b-prompt.md) |
| Index size | ~17 GB RSS daemon | **2.85 GB RSS daemon** (1/6) |
| Memory available (idle) | ~38 GB | **53 GB** |
| node_modules 노이즈 | 포함 | 제거 |
| Search latency (cold) | hang / abort | **350초 (5분 50초)** |

## 미해결 (별도 FU)
**Search latency는 user 예측 1-3s 대비 ~100배 느림 (350s).** 원인:
- 인덱스가 `is_recompute: true, is_pruned: true`로 빌드됨 → 매 search마다 graph-traversal 노드별 0.6B re-embedding.
- HNSW `graph_degree=32, complexity=64` × 54,431 chunks → 방문 노드 多.
- `--no-recompute` search 시도 → 실패 (exit 1, 168s): `"Recompute is required for pruned/compact HNSW index. Re-run search with --recompute, or rebuild with --no-recompute and --no-compact."`

**Latency 진짜 해결 경로** (별도 task로 분리):
- 옵션 A: `--no-recompute --no-compact`로 인덱스 재빌드 (~5분 GPU). 임베딩 저장 → search 1-3s. Index 크기 ~250 MB 추가.
- 옵션 B: 다른 backend(diskann)나 graph 파라미터(`--graph-degree`/`--complexity` 축소).
- 옵션 C: 더 가벼운 검색 stack 조사 (예: FAISS flat + 작은 모델).

**현 상태에서도 운영 영향 제한적**: Hermes Context Pack은 이미 `2>/dev/null` + `timeout 45` graceful degrade. 350s는 timeout에 걸려 빈 컨텍스트로 떨어지지만 라우터 자체는 정상 동작.

## 잔여 작업
- `claude-chat-history` 8B daemon (PID 80075, 14.4 GB) — 다음 0.6B 재인덱스 권장.
- Latency 별도 FU.
- ComfyUI 재가동: 검색이 CPU라 이제 GPU 공존 안전.

## Rollback
8B index 복원: `mv ~/.leann/indexes/yagi-workshop-docs.8b-backup-20260528-1706 ~/.leann/indexes/yagi-workshop-docs` + override conf 제거 + daemon restart.
