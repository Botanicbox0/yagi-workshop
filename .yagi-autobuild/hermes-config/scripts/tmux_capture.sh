#!/bin/bash
# Capture the last N lines of a router executor tmux pane.
# Usage: tmux_capture.sh [session] [lines]
#   session: claude-bg (default) | codex-bg
#   lines:   100 (default)
# Each executor runs on its own tmux socket (-L) named after the session, so the
# two services are fully independent. Used by the learn-from-claude-code meta-skill.
TARGET=${1:-claude-bg}
LINES=${2:-100}
tmux -L "${TARGET}" capture-pane -t "${TARGET}" -p -S -"${LINES}" 2>/dev/null
