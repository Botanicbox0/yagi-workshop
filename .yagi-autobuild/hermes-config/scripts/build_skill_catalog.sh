#!/bin/bash
# Build the Hermes skill catalog (Layer 1 of the self-evolving router).
#
# Scans the THREE real skill locations on this machine (the spec's /mnt/skills
# path does not exist here):
#   1. yagi-workshop project skills  : <repo>/.claude/skills/*/SKILL.md
#   2. Claude Code plugin skills      : ~/.claude/plugins/**/skills/*/SKILL.md
#   3. Hermes agent skills            : ~/.hermes/skills/*/*/SKILL.md
#
# The catalog is what the learn-from-claude-code meta-skill reads to decide
# which skills to hint to claude-bg in a dispatch.
set -u

CATALOG="${HOME}/.hermes/skill-catalog.md"
REPO="/mnt/d/AI/projects/yagi-workshop"

# Extract a one-line description from SKILL.md YAML frontmatter.
# Handles both `description: text` (single-line, optionally quoted) and YAML
# block scalars (`description: >-` / `|` with indented continuation lines).
extract_desc() {
  awk '
    /^---[[:space:]]*$/ { fm++; if (fm==1) { infm=1; next } else { exit } }
    infm!=1 { next }
    indesc==1 {
      if ($0 ~ /^[A-Za-z0-9_-]+:/) { exit }      # next frontmatter key
      line=$0; sub(/^[[:space:]]+/, "", line)
      desc = (desc=="" ? line : desc " " line)
      next
    }
    /^description:/ {
      val=$0; sub(/^description:[[:space:]]*/, "", val)
      if (val=="" || val ~ /^[|>][+-]?$/) { indesc=1; next }   # block scalar
      sub(/^"/, "", val); sub(/"$/, "", val)
      desc=val; exit
    }
    END { print desc }
  ' "$1" | cut -c1-300
}

emit_skill() {
  local skill_md="$1" tag="$2"
  local name desc
  name=$(basename "$(dirname "$skill_md")")
  desc=$(extract_desc "$skill_md")
  {
    echo "## ${name} (${tag})"
    echo "Location: ${skill_md}"
    echo "Description: ${desc}"
    echo ""
  } >> "$CATALOG"
}

{
  echo "# Claude Code Skill Catalog"
  echo "Auto-generated $(date -Iseconds)"
  echo ""
  echo "Layer 1 of the Hermes self-evolving router. Read this to pick 1-3 skills"
  echo "relevant to a task, then hint them to claude-bg in the dispatch."
  echo ""
} > "$CATALOG"

# 1. yagi-workshop project skills
echo "# === Project skills (yagi-workshop) ===" >> "$CATALOG"
echo "" >> "$CATALOG"
for skill_md in "$REPO"/.claude/skills/*/SKILL.md; do
  [ -f "$skill_md" ] && emit_skill "$skill_md" "project"
done

# 2. Claude Code plugin skills (superpowers, frontend-design, mcp-server-dev, etc.)
echo "# === Claude Code plugin skills ===" >> "$CATALOG"
echo "" >> "$CATALOG"
while IFS= read -r skill_md; do
  [ -f "$skill_md" ] && emit_skill "$skill_md" "plugin"
done < <(find "${HOME}/.claude/plugins" -path '*/skills/*/SKILL.md' 2>/dev/null | sort)

# 3. Hermes agent skills (category/skill nesting)
echo "# === Hermes agent skills ===" >> "$CATALOG"
echo "" >> "$CATALOG"
while IFS= read -r skill_md; do
  [ -f "$skill_md" ] && emit_skill "$skill_md" "hermes"
done < <(find "${HOME}/.hermes/skills" -mindepth 2 -name SKILL.md 2>/dev/null | sort)

count=$(grep -c '^## ' "$CATALOG")
echo "Skill catalog built: ${count} skills → ${CATALOG}"
