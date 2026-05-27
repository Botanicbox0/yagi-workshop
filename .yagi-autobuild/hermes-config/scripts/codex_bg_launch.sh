#!/bin/bash
# Long-lived Codex executor for the Hermes router (codex-bg tmux session).
# Runs in a respawn loop so a crash/exit of the REPL self-heals.
# Launched by codex-bg.service inside a tmux session (provides the pty the TUI needs).
set -u
export PATH="/home/yagi/.local/bin:/usr/local/bin:/usr/bin:/bin"
export TERM="xterm-256color"
cd /mnt/d/AI/projects/yagi-workshop || exit 1
while true; do
  codex --profile deep
  echo "[$(date -Iseconds)] codex-bg REPL exited; respawning in 5s"
  sleep 5
done
