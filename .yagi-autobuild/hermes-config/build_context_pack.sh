#!/bin/bash
# Hermes router → Codex 위임 시 Context Pack 생성 (TASK 30A, 전략 C).
# Usage: build_context_pack.sh "<task intent>" [LOW|MED|HIGH|DANGER]
# Output: stdout markdown Context Pack.

INTENT="$1"
RISK="${2:-LOW}"
REPO="/mnt/d/AI/projects/yagi-workshop"

LAST_COMMIT="$(cd "$REPO" && git log -1 --oneline 2>/dev/null)"
# LEANN retrieval (CPU mode은 느리거나 crash 가능 — 실패 시 graceful degrade).
RAG="$(timeout 45 leann search yagi-workshop-docs "$INTENT" --top-k 3 2>/dev/null | head -15)"
[ -z "$RAG" ] && RAG="(LEANN unavailable — inspect .yagi-autobuild/PRODUCT-MASTER.md directly)"

cat << CTXPACK
[Task Context Pack — Hermes router]
Goal: $INTENT

Risk Level: $RISK
Executor: Primary codex-bg; Reviewer claude-bg if HIGH/DANGER.
Reason for routing: derived from intent + AGENTS.md + skill catalog.

Active Phase: Phase 8 후반
Last commit: $LAST_COMMIT

PRODUCT-MASTER active 룰 (LEANN retrieval):
$RAG

Implementation Constraints:
- append-only where applicable (PRODUCT-MASTER.md supersede only)
- no hardcoded literal (token-based only)
- v1.2 design tokens only (#0A0A0A bg, #ED1E1E primary, #FAD204 secondary; v1.1 #9A361F/#F3D174 폐기)
- direct file inspection required (RAG summary 의존 X)
- K-05 dual review if HIGH/DANGER

Commands: pnpm dev / lint / tsc --noEmit / test
MCP Verification:
- Filesystem: yagi-workshop scope only
- Git: status/diff before final; force push 금지
- Playwright: REQUIRED if UI/route/component touched
- Supabase: read-only unless confirmed
- Slack: final response only, no secrets

Skills to load (risk-level별):
- LOW: none
- MED: 1 relevant
- HIGH/DANGER: 1-3 relevant + Claude review

Instruction to Codex:
Use this context pack as a guide. Before editing, inspect referenced original files
directly. Do not rely on summaries for implementation-critical details. Use MCP tools
for verification, not unrestricted autonomous execution.
CTXPACK
