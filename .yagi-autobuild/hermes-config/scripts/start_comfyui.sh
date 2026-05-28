#!/bin/bash
set -e

# GPU memory 검사 — full path: systemd --user PATH에 /usr/lib/wsl/lib 없음 (TASK 24)
NVIDIA_SMI=/usr/lib/wsl/lib/nvidia-smi
FREE_MB=$($NVIDIA_SMI --query-gpu=memory.free --format=csv,noheader,nounits | head -1)
TOTAL_MB=$($NVIDIA_SMI --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
echo "[ComfyUI] GPU memory: ${FREE_MB}/${TOTAL_MB} MB free"

# Cleanup: ComfyUI process group 확실히 종료
# - ComfyUI(특히 ComfyUI-Manager registry-fetch thread)는 SIGINT/SIGTERM을 무시할 수
#   있어 grace 후 SIGKILL로 escalate.
# - ComfyUI가 자식 python을 spawn하므로 단일 PID가 아닌 process group 전체를 종료.
COMFY_CHILD=""
cleanup() {
    if [ -n "$COMFY_CHILD" ] && kill -0 "$COMFY_CHILD" 2>/dev/null; then
        echo "[ComfyUI] stopping PGID $COMFY_CHILD: SIGINT → 10s grace → SIGKILL"
        kill -INT -"$COMFY_CHILD" 2>/dev/null || true
        for _ in $(seq 1 10); do kill -0 "$COMFY_CHILD" 2>/dev/null || break; sleep 1; done
        kill -KILL -"$COMFY_CHILD" 2>/dev/null || true
    fi
}
# EXIT trap이 항상 cleanup 실행. INT/TERM은 exit를 유발해 EXIT trap으로 수렴.
trap cleanup EXIT
trap 'exit 0' INT TERM

# ComfyUI 실행 (모든 인터페이스에 listen, Tailscale 노출용)
cd /mnt/d/AI/comfyui
source venv/bin/activate 2>/dev/null || source .venv/bin/activate

# NOTE: exec 사용 X — exec는 bash를 python으로 치환해 trap cleanup을 무력화한다.
# setsid로 python을 새 process group leader로 띄워(PGID == python PID) cleanup에서
# group 전체를 종료한다 (자식/orphan 포함).
setsid python main.py --listen 0.0.0.0 --port 8188 "$@" &
COMFY_CHILD=$!
wait "$COMFY_CHILD"
