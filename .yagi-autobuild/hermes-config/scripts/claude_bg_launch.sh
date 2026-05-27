#!/bin/bash
# Long-lived Claude Code executor for the Hermes router (claude-bg tmux session).
# Runs in a respawn loop so a crash/exit of the REPL self-heals.
# Launched by claude-bg.service inside a tmux session (provides the pty the TUI needs).
set -u
export PATH="/home/yagi/.local/bin:/usr/local/bin:/usr/bin:/bin"
export TERM="xterm-256color"
cd /mnt/d/AI/projects/yagi-workshop || exit 1
while true; do
  claude --dangerously-skip-permissions
  echo "[$(date -Iseconds)] claude-bg REPL exited; respawning in 5s"
  sleep 5
done
