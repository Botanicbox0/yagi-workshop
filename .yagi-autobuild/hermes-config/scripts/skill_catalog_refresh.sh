#!/bin/bash
# Weekly skill-catalog refresh for the Hermes router (Layer 1 sync).
# Re-scans real skill locations so new/changed skills appear in the catalog.
# cron gives a minimal env: set PATH so tmux/find/awk resolve.
set -u
export PATH="/home/yagi/.local/bin:/usr/local/bin:/usr/bin:/bin"
bash /mnt/d/AI/scripts/router/build_skill_catalog.sh
echo "[$(date -Iseconds)] Skill catalog refreshed" >> /mnt/d/AI/scripts/logs/skill_catalog.log
