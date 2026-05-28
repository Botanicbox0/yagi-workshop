# TASK 33 — LEANN 폐기 + Chroma 최소 RAG

> UPDATED 2026-05-28: 야기 확정으로 LEANN runtime/index/service/tool/log를 제거했고, Chroma `127.0.0.1:8900`이 현재 retrieval이다. `claude-chat-history` index만 보존.

## Migration date
2026-05-28 (KST)

## 배경
- LEANN의 **recompute 설계**(임베딩을 저장하지 않고 매 검색 시 graph-traversal 노드별 재계산)는 저장공간 절약이 목적인데, 야기 환경(CPU 검색 강제 + 54K chunk + ComfyUI GPU 공존)에선 구조적 미스매치.
- TASK 30A: 8B+CPU search SIGABRT (exit 134).
- TASK 32: 0.6B 재인덱스로 SIGABRT는 해결했으나 latency 5분 50초/query (recompute 비용).
- GPT + Web Claude 합의: 저장형 vector DB(Chroma)로 근본 전환.

## 결과 (검증 — set -o pipefail + exit code 직접)

| 지표 | LEANN 8B | LEANN 0.6B (TASK 32) | **Chroma daemon (TASK 33)** |
|---|---|---|---|
| EXIT_CODE | 134 (SIGABRT) | 0 | **0** ✅ |
| Search latency | hang / abort | 350s (recompute) | **100–450 ms** (HOT) |
| Daemon RSS | 14.4 GB | 2.85 GB | **3.1 GB** |
| Index size | 17 GB | 63 MB | **6.6 MB** |
| 색인 시간 | — | 5 min GPU | 4 min CPU |

LEANN 대비 **3500배 가속**, 디스크 57배 작음.

### 정확도 (top-3, 모두 hot daemon)
- "design system v1.2 primary hex" → AGENTS.md v1.2 토큰 섹션 (0.675), SKILL.md yagi-design-system (0.669), PRODUCT-MASTER §AO (0.634). ✅
- "BRAND-Only Vertical Pivot CELEBRITY" → PRODUCT-MASTER §AN (**0.782**), §AQ Americano (0.621), AGENTS.md PRODUCT-MASTER 룰 (0.608). ✅
- "typography Editorial New" → TYPOGRAPHY_SPEC §3.1 (0.719), PRODUCT-MASTER Typography (0.69). ✅
- "Operations Automation 세금계산서" → COMPONENT_CONTRACTS Role 0.655 (top, **무관**), §AQ Americano 0.61. ⚠️ 일부 chunk-boundary 이슈 — §AS heading-only chunk가 본문 누락. 추후 chunk size 튜닝 또는 §AS 영역만 별도 색인.

## 변경 요약
1. LEANN daemon stop → systemd 잔재 제거 (`leann-daemon.service.d/*.conf` 삭제, service `disable`).
2. **Chroma `PersistentClient`** at `/mnt/d/AI/chroma`, collection `yagi-docs`.
3. **색인 14개 소스, 716 chunks** (heading-aware + size-bounded hybrid chunking, size=800, overlap=3 trailing lines):
   - `.yagi-autobuild/PRODUCT-MASTER.md` (123)
   - 4 × `AGENTS.md` (top/src/.yagi-autobuild/supabase, 31 합계)
   - `.claude/skills/yagi-design-system/SKILL.md` (31)
   - `.yagi-autobuild/design-system/*.md` × 8 (PRINCIPLES, TYPOGRAPHY, INTERACTION, COMPONENT_CONTRACTS, ANTI_PATTERNS, CHANGELOG, REFERENCES, UI_FRAMES — 합 531).
4. 임베딩 모델 **Qwen3-Embedding-0.6B on CPU** (build-time 1회, 검색 시 query 1개만 임베딩).
5. **Chroma 검색 daemon** (`/mnt/d/AI/scripts/chroma/server.py`, HTTP `127.0.0.1:8900`) systemd user service `chroma-search.service`. 모델 1회 로드 후 상주 (~3.1 GB RSS).
6. **Hermes Context Pack 연결** — `build_context_pack.sh`의 LEANN call → `curl 127.0.0.1:8900` + python JSON parser. 전체 Context Pack 빌드 192 ms.

## 핵심 차이 (왜 빠른가)
- LEANN: search 시 graph traversal + 매 노드마다 model forward (recompute). N개 노드 × ~3s = 분 단위.
- Chroma: 임베딩은 build-time에 sqlite에 저장. search = query 1개만 임베딩(< 100ms) + 벡터 nearest-neighbor lookup (< 10ms).

## Trade-off
- 디스크: 임베딩 저장으로 약간 증가 — 716 chunks × 1024 dim × float32 ≈ 3 MB (Chroma 6.6 MB 전체 안에 포함).
- 범위: 14개 핵심 소스로 한정. yagi-workshop 전체 .md (수백 개)은 미색인 — 필요 시 `build_index.py SOURCES`에 추가.
- claude-chat-history: 이번 범위 밖. LEANN 인덱스 보존(199 MB).

## 보존 (롤백 가능)
- yagi-workshop-docs 0.6B index, 8B backup, LEANN service/tool/log는 2026-05-28 야기 확정 후 제거 완료.
- `build_context_pack.sh.leann.bak` 제거 완료. 현재 `build_context_pack.sh`는 Chroma `127.0.0.1:8900` 호출.
- systemd unit `leann-daemon.service`와 drop-in mirror 제거 완료.
- `claude-chat-history` index만 야기 명시 보존.

## 잔여
- Chroma 색인 범위 확장 (현재 14개 → 필요 시 widening 또는 `.yagi-autobuild/phase-*` 추가).
- "세금계산서" 같은 §AS-deep 쿼리 정확도 — chunk size 튜닝 또는 PRODUCT-MASTER chunk 경계 검토.
- claude-chat-history Chroma 색인 (필요 시).
- 완료: LEANN 영구 제거. `claude-chat-history`만 보존.

## 교훈 (TASK 32 → 33 연쇄)
- **저장 vs 재계산**: 검색 latency = 임베딩 저장형이 본질적으로 빠름. recompute 설계는 디스크가 비싼 환경에서만 의미.
- 검증은 `set -o pipefail` + 직접 exit code (`echo "EXIT: $?"`). 절대 `| tail`/`| head`/`| grep`에서 pipefail 없이 끝내지 말 것.
- Python f-string의 `\"` 이스케이프는 3.11에서 syntax error — 내부 따옴표는 작은따옴표로.
