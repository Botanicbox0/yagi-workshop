# TASK 29 — LEANN CPU Mode for ComfyUI 공존

> SUPERSEDED 2026-05-28: LEANN runtime/index/service는 폐기됨. 현재 retrieval은 Chroma `127.0.0.1:8900`이며 운영 기준은 `CODEX-NATIVE.md §7`.

Date: 2026-05-28
Owner: yagi (req) / Claude Code (impl)

## 결정 배경
야기 요청: ComfyUI는 멈출 수 없는데 Hermes Notifier도 동시에 살아 있어야 한다.
서버 데미지 0%, GPU 충돌 0%가 hard constraint. Search latency는 trade-off로 수용.

이전 증상: ComfyUI 실행 시 `start_comfyui.sh`가 GPU 16GB 확보를 위해 LEANN daemon을
stop → Notifier가 retrieval 못 함. 또한 두 8B 모델이 GPU 경합.

## 진단 (어디서 device가 결정되는가)
- systemd unit / MCP wrapper: device 변수 **없음** → auto-detect로 폴백.
- LEANN Python source가 결정:
  - `leann/embedding_compute.py:433` → env `LEANN_EMBEDDING_DEVICE` (daemon 임베딩 서버)
  - `leann/chat.py:593` → env `LEANN_LLM_DEVICE`
  - 둘 다 unset이면 `torch.cuda.is_available()` → "cuda".
- `start_comfyui.sh:10-17` → ComfyUI 시작 시 LEANN을 **명시적으로 stop**, 종료 시 재시작.

⚠️ 계획서 초안의 `LEANN_DEVICE` / `TRANSFORMERS_DEVICE` / `TORCH_DEVICE`는 이 빌드가
**읽지 않음** (무시됨). 실제 lever는 `LEANN_EMBEDDING_DEVICE` / `LEANN_LLM_DEVICE` +
`CUDA_VISIBLE_DEVICES=""`(belt: cuda.is_available()를 강제 False).

## 변경 사항
1. systemd drop-in `~/.config/systemd/user/leann-daemon.service.d/cpu-mode.conf`:
   - `CUDA_VISIBLE_DEVICES=""`
   - `LEANN_EMBEDDING_DEVICE=cpu`, `LEANN_LLM_DEVICE=cpu`
   - `OMP_NUM_THREADS=16`, `MKL_NUM_THREADS=16`, `FAISS_NUM_THREADS=8`
     (상속된 user-manager env가 OMP/MKL을 1로 고정 — GPU 시대 설정. CPU에서는
     단일 스레드가 됨. 32코어 박스에서 임베딩 burst에 16스레드 할당, 16은 ComfyUI용.)
2. `start_comfyui.sh`: LEANN stop/restart hook 주석 처리 (LEANN_WAS_ACTIVE=false 유지 →
   cleanup의 재시작도 자동 no-op). ComfyUI process-group 종료 로직은 그대로.
3. 결과: ComfyUI 단독 GPU, LEANN 단독 RAM. 둘 다 24/7 공존.

## Trade-off (측정값 — 정직하게)
- LEANN 검색 latency: GPU 1-2s → **CPU warm ~28-32s** (계획서 가정 5-10s보다 3x 느림).
  - 원인: LEANN은 임베딩을 저장하지 않고 **검색 중 graph traversal에서 재계산**한다
    (LEANN의 97% 저장공간 절감 설계). CPU에서는 8B forward pass가 노드마다 반복 →
    스레드를 1→16으로 올려도 32s→28s로 미미 (recomputation-bound, not thread-bound).
  - 5-10s 도달은 env 튜닝으로는 불가. 더 작은 임베딩 모델로 재인덱싱하거나 GPU 사용이
    필요 (둘 다 hard constraint 또는 별도 task와 충돌) → 야기가 ~30s 수용 결정.
- GPU OOM / 경합 위험: 제거 (0%).
- ComfyUI 워크플로우 영향: 0% (GPU 단독 사용, 97GB 전체 가용).
- Hermes Notifier: 24/7 생존 (ComfyUI 실행 중에도 죽지 않음).
- RAM: LEANN ~14GB (128GB DDR5 중) — 여유 충분.

## Verification (live evidence)
- 실행 unit env: `CUDA_VISIBLE_DEVICES=` `LEANN_EMBEDDING_DEVICE=cpu` `LEANN_LLM_DEVICE=cpu`
  `OMP_NUM_THREADS=16` `MKL_NUM_THREADS=16` `FAISS_NUM_THREADS=8` ✓
- 임베딩 서버(PID 34955) `/proc/<pid>/fd`에 nvidia fd 없음 → GPU 미사용 ✓
- `nvidia-smi`: LEANN 프로세스 GPU 점유 없음, GPU used 2.3GB/97.9GB (ComfyUI만) ✓
- ComfyUI(comfyui.service, `python main.py --port 8188`)가 **변경 적용 중에도 GPU에서
  계속 실행** → 공존 라이브 입증 ✓
- 검색 정확도: "design system v1.2" 쿼리 → `#ED1E1E` primary + `#FAD204` secondary +
  v1.1 retired 정확 반환 ✓ (warm ~28-32s)
- RAM: 임베딩 서버 RSS 13.8GB ✓

## Hermes 별도 발견 (TASK 29 범위 외, 참고)
gateway 로그에 07:25-07:26 동안 Slack Socket Mode `WSServerHandshakeError: 408`
재연결 루프 존재 → 07:26:32 이후 자동 복구 (이후 14분간 에러 없음). LEANN hang이
아니라 Slack wss-primary 측 일시 장애. 이전 "메시지 무응답"의 원인 후보 중 하나.
gateway는 verify만 하고 재시작하지 않음 (불필요한 408 재유발 회피).

## 영구성 (lock-in)
- systemd drop-in `.conf`로 영구 (재부팅 후 유지).
- `start_comfyui.sh` 백업: `start_comfyui.sh.bak.20260528`.
- repo mirror: `.yagi-autobuild/hermes-config/systemd/leann-daemon.service.d/cpu-mode.conf`,
  `.yagi-autobuild/hermes-config/scripts/start_comfyui.sh`.

## Rollback (GPU 모드 복귀가 필요하면)
1. `rm ~/.config/systemd/user/leann-daemon.service.d/cpu-mode.conf`
2. `cp /mnt/d/AI/scripts/comfyui/start_comfyui.sh.bak.20260528 /mnt/d/AI/scripts/comfyui/start_comfyui.sh`
3. `systemctl --user daemon-reload && systemctl --user restart leann-daemon.service`
