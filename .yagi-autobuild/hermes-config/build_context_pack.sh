#!/bin/bash
# Hermes router → Codex 위임 시 Context Pack 생성 (TASK 30A, 전략 C).
# Usage: build_context_pack.sh "<task intent>" [LOW|MED|HIGH|DANGER]
# Output: stdout markdown Context Pack.

INTENT="$1"
RISK="${2:-LOW}"
REPO="/mnt/d/AI/projects/yagi-workshop"

LAST_COMMIT="$(cd "$REPO" && git log -1 --oneline 2>/dev/null)"

# Chroma retrieval. Daemon on 127.0.0.1:8900 keeps the
# 0.6B model resident; hot queries return in ~100-450 ms. urlencode via python3.
# Falls back to a one-line note if the daemon is down (graceful degrade).
Q_ENC="$(printf '%s' "$INTENT" | python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.stdin.read()))' 2>/dev/null)"
RAG="$(timeout 5 curl -s "http://127.0.0.1:8900/?q=${Q_ENC}&k=3" 2>/dev/null \
  | python3 -c '
import json, sys
try:
    items = json.load(sys.stdin)
    if not items:
        print("(no hits)")
        sys.exit(0)
    for it in items:
        src = it.get("source", "?")
        head = it.get("heading", "")
        score = it.get("score", 0)
        print(f"- [{src}] {head} (score {score})")
        snip = it.get("snippet", "").replace("\n", " ")[:180]
        if snip:
            print(f"    {snip}")
except Exception as e:
    print(f"(retrieval parse error: {e})")
' 2>/dev/null)"
[ -z "$RAG" ] && RAG="(retrieval unavailable)"

cat << CTXPACK
[Task Context Pack — Hermes router]
Goal: $INTENT

Risk Level: $RISK
Executor: Primary codex-bg; Reviewer claude-bg if HIGH/DANGER.
Reason for routing: derived from intent + AGENTS.md + skill catalog.

Active Phase: Phase 8 후반
Last commit: $LAST_COMMIT

PRODUCT-MASTER active 룰 (Chroma retrieval, port 8900):
$RAG

Implementation Constraints:
- PRODUCT-MASTER.md is a living document; edit the current truth directly and record major changes in Decision Log
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
