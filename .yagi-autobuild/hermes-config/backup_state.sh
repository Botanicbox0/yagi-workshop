#!/bin/bash
# Rollback Hermes router state to the most recent TASK 30A pre-migration backup.
BACKUP_DIR=$(ls -td ~/.hermes/backups/pre-codex-30a-* | head -1)
cp -r "$BACKUP_DIR/yagi-router-backup/." ~/.hermes/profiles/yagi-router/
[ -f "$BACKUP_DIR/MEMORY.md.bak" ] && cp "$BACKUP_DIR/MEMORY.md.bak" ~/.hermes/memories/MEMORY.md
systemctl --user restart hermes-slack-gateway.service
echo "Rollback complete from $BACKUP_DIR"
