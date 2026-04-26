#!/usr/bin/env bash
# Phase 2.8.1 G_B1-A — grep-level CI guard for the RSC form-action anti-pattern.
# Detects `<form action={async ...}>` in src/. Returns 1 on match.
# Complements eslint.config.mjs `yagi-rsc/no-async-form-action` rule.
set -euo pipefail

ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SRC_DIR="${ROOT}/src"

if [ ! -d "${SRC_DIR}" ]; then
  echo "check-rsc-form-action: src/ not found at ${SRC_DIR}" >&2
  exit 2
fi

# Pattern: action={ optional whitespace then 'async'
matches="$(grep -rEn 'action=\{[[:space:]]*async\b' "${SRC_DIR}" 2>/dev/null || true)"

if [ -n "${matches}" ]; then
  echo "RSC form-action anti-pattern detected:" >&2
  echo "${matches}" >&2
  echo "" >&2
  echo "Inline async arrow on <form action={...}> breaks RSC serialization." >&2
  echo "Define the action with 'use server' at module scope and pass by reference." >&2
  exit 1
fi

echo "check-rsc-form-action: 0 occurrences in ${SRC_DIR}"
exit 0
